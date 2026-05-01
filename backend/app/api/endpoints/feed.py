from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor
import os

from app.db.session import get_db

router = APIRouter()

def get_ai_db_connection():
    """Get connection to the AI database (where alerts and scraped_data tables are stored)"""
    # Use the same database as the AI scrapers
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=os.getenv('DB_PORT', '5432'),
        database=os.getenv('DB_NAME', 'pravaah_db'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', 'atharv')
    )

@router.get("/alerts", response_model=List[Dict[str, Any]], summary="Get recent alerts from AI scrapers")
async def get_alerts(limit: int = 20):
    """
    Fetch recent alerts from the alerts table (populated by YouTube scraper)
    Returns empty list if table doesn't exist yet.
    """
    try:
        conn = get_ai_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Check if alerts table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'alerts'
            )
        """)
        
        table_exists = cur.fetchone()[0]
        
        if not table_exists:
            cur.close()
            conn.close()
            return []
        
        query = """
        SELECT 
            event_type as title,
            sentiment,
            urgency,
            location,
            video_url as link,
            video_created_at as created_at,
            'youtube' as source
        FROM alerts 
        ORDER BY video_created_at DESC 
        LIMIT %s
        """
        
        cur.execute(query, (limit,))
        alerts = cur.fetchall()
        
        # Convert to list of dicts with proper JSON serialization
        result = []
        for alert in alerts:
            alert_dict = dict(alert)
            # Ensure all required fields are present
            alert_dict['title'] = alert_dict.get('title') or 'Ocean Alert'
            alert_dict['sentiment'] = alert_dict.get('sentiment') or 'neutral'
            alert_dict['urgency'] = alert_dict.get('urgency') or 'medium'
            alert_dict['location'] = alert_dict.get('location') or 'Unknown'
            alert_dict['link'] = alert_dict.get('link') or '#'
            # Convert datetime to ISO string for JSON serialization
            created_at = alert_dict.get('created_at')
            if created_at:
                alert_dict['created_at'] = created_at.isoformat() if hasattr(created_at, 'isoformat') else str(created_at)
            else:
                alert_dict['created_at'] = None
            alert_dict['source'] = alert_dict.get('source') or 'youtube'
            result.append(alert_dict)
        
        cur.close()
        conn.close()
        
        return result
        
    except Exception as e:
        print(f"Failed to fetch alerts: {str(e)}")
        return []

@router.get("/scraped-data", response_model=List[Dict[str, Any]], summary="Get recent scraped data from AI scrapers")
async def get_scraped_data(limit: int = 20):
    """
    Fetch recent scraped data from the scraped_data table (populated by Twitter scraper)
    Returns empty list if table doesn't exist yet.
    """
    try:
        conn = get_ai_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Check if scraped_data table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'scraped_data'
            )
        """)
        
        table_exists = cur.fetchone()[0]
        
        if not table_exists:
            cur.close()
            conn.close()
            return []
        
        query = """
        SELECT 
            event_type as title,
            sentiment,
            urgency,
            location,
            source_url as link,
            source_created_at as created_at,
            'twitter' as source
        FROM scraped_data 
        ORDER BY source_created_at DESC 
        LIMIT %s
        """
        
        cur.execute(query, (limit,))
        scraped_data = cur.fetchall()
        
        # Convert to list of dicts with proper JSON serialization
        result = []
        for data in scraped_data:
            data_dict = dict(data)
            # Ensure all required fields are present
            data_dict['title'] = data_dict.get('title') or 'Social Media Alert'
            data_dict['sentiment'] = data_dict.get('sentiment') or 'neutral'
            data_dict['urgency'] = data_dict.get('urgency') or 'medium'
            data_dict['location'] = data_dict.get('location') or 'Unknown'
            data_dict['link'] = data_dict.get('link') or '#'
            # Convert datetime to ISO string for JSON serialization
            created_at = data_dict.get('created_at')
            if created_at:
                data_dict['created_at'] = created_at.isoformat() if hasattr(created_at, 'isoformat') else str(created_at)
            else:
                data_dict['created_at'] = None
            data_dict['source'] = data_dict.get('source') or 'twitter'
            result.append(data_dict)
        
        cur.close()
        conn.close()
        
        return result
        
    except Exception as e:
        print(f"Failed to fetch scraped data: {str(e)}")
        return []

@router.get("/combined-feed", response_model=List[Dict[str, Any]], summary="Get combined feed from all AI sources")
async def get_combined_feed(limit: int = 30):
    """
    Fetch combined feed from both alerts and scraped_data tables.
    Returns empty list if AI tables don't exist yet.
    """
    try:
        conn = get_ai_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Check if tables exist first
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'alerts'
            ) as alerts_exists,
            EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'scraped_data'
            ) as scraped_data_exists
        """)
        
        table_check = cur.fetchone()
        alerts_exists = table_check['alerts_exists'] if table_check else False
        scraped_data_exists = table_check['scraped_data_exists'] if table_check else False
        
        result = []
        
        if alerts_exists or scraped_data_exists:
            # Build dynamic query based on existing tables
            queries = []
            
            if alerts_exists:
                queries.append("""
                    SELECT 
                        event_type as title,
                        sentiment,
                        urgency,
                        location,
                        video_url as link,
                        video_created_at as created_at,
                        'youtube' as source
                    FROM alerts 
                    WHERE video_created_at IS NOT NULL
                """)
            
            if scraped_data_exists:
                queries.append("""
                    SELECT 
                        event_type as title,
                        sentiment,
                        urgency,
                        location,
                        source_url as link,
                        source_created_at as created_at,
                        'twitter' as source
                    FROM scraped_data 
                    WHERE source_created_at IS NOT NULL
                """)
            
            if queries:
                query = f"({') UNION ALL ('.join(queries)}) ORDER BY created_at DESC LIMIT %s"
                cur.execute(query, (limit,))
                feed_items = cur.fetchall()
                
                # Convert to list of dicts with proper JSON serialization
                for item in feed_items:
                    item_dict = dict(item)
                    # Ensure all required fields are present
                    item_dict['title'] = item_dict.get('title') or 'Ocean Alert'
                    item_dict['sentiment'] = item_dict.get('sentiment') or 'neutral'
                    item_dict['urgency'] = item_dict.get('urgency') or 'medium'
                    item_dict['location'] = item_dict.get('location') or 'Unknown'
                    item_dict['link'] = item_dict.get('link') or '#'
                    # Convert datetime to ISO string for JSON serialization
                    created_at = item_dict.get('created_at')
                    if created_at:
                        item_dict['created_at'] = created_at.isoformat() if hasattr(created_at, 'isoformat') else str(created_at)
                    else:
                        item_dict['created_at'] = None
                    item_dict['source'] = item_dict.get('source') or 'unknown'
                    result.append(item_dict)
        
        cur.close()
        conn.close()
        
        # Return empty list if no AI data is available yet
        return result
        
    except Exception as e:
        # Return empty list instead of 500 error if AI tables aren't set up yet
        print(f"AI feed not available: {str(e)}")
        return []


@router.get("/hazard-feed", response_model=List[Dict[str, Any]], summary="Get ML-detected hazardous posts from social media")
async def get_hazard_feed(limit: int = 20, min_confidence: float = 0.3, hours: int = 24):
    """
    Fetch ML-detected hazardous posts from social media using the enhanced AI worker.
    This endpoint serves the citizen homepage feed with automatically detected hazardous content.
    
    Args:
        limit: Maximum number of posts to return
        min_confidence: Minimum confidence score for hazard detection (0.0-1.0)
        hours: How many hours back to look for posts
    """
    try:
        conn = get_ai_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Check if social_media_hazards table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'social_media_hazards'
            )
        """)
        
        table_exists = cur.fetchone()[0]
        
        if not table_exists:
            cur.close()
            conn.close()
            return []
        
        # Calculate time threshold
        from datetime import datetime, timedelta
        since_time = datetime.utcnow() - timedelta(hours=hours)
        
        query = """
        SELECT 
            source,
            post_text as text,
            post_url as link,
            author,
            post_timestamp,
            hazard_type as title,
            confidence_score,
            sentiment,
            sentiment_score,
            urgency_level as urgency,
            urgency_score,
            location_hints,
            detected_keywords,
            analysis_timestamp as created_at,
            indian_relevant
        FROM social_media_hazards 
        WHERE 
            is_hazard = true 
            AND indian_relevant = true
            AND confidence_score >= %s 
            AND analysis_timestamp >= %s
            AND status != 'false_positive'
        ORDER BY 
            urgency_score DESC, 
            confidence_score DESC, 
            analysis_timestamp DESC
        LIMIT %s
        """
        
        cur.execute(query, (min_confidence, since_time, limit))
        hazard_posts = cur.fetchall()
        
        # Convert to feed format compatible with frontend
        result = []
        for post in hazard_posts:
            post_dict = dict(post)
            
            # Format for citizen feed
            feed_item = {
                'id': f"hazard_{post_dict.get('source', 'unknown')}_{hash(post_dict.get('text', ''))}",
                'title': f"🚨 {post_dict.get('title', 'Hazard Alert').title()}",
                'text': post_dict.get('text', ''),
                'source': post_dict.get('source', 'social_media'),
                'link': post_dict.get('link', '#'),
                'author': post_dict.get('author', 'Unknown'),
                'sentiment': post_dict.get('sentiment', 'neutral'),
                'urgency': post_dict.get('urgency', 'medium'),
                'confidence': round(post_dict.get('confidence_score', 0.0), 2),
                'location_hints': post_dict.get('location_hints', []),
                'detected_keywords': post_dict.get('detected_keywords', []),
                
                # Timestamps
                'post_timestamp': post_dict.get('post_timestamp').isoformat() if post_dict.get('post_timestamp') else None,
                'created_at': post_dict.get('created_at').isoformat() if post_dict.get('created_at') else None,
                
                # Additional metadata for frontend
                'type': 'ml_detection',
                'hazard_type': post_dict.get('title', 'general'),
                'ai_detected': True,
                'urgency_score': round(post_dict.get('urgency_score', 0.0), 2),
                'sentiment_score': round(post_dict.get('sentiment_score', 0.0), 2)
            }
            
            result.append(feed_item)
        
        cur.close()
        conn.close()
        
        return result
        
    except Exception as e:
        print(f"Error fetching hazard feed: {str(e)}")
        return []


@router.get("/hazard-stats", response_model=Dict[str, Any], summary="Get statistics for ML-detected hazards")
async def get_hazard_stats(hours: int = 24):
    """
    Get statistics about ML-detected hazards for the dashboard
    """
    try:
        conn = get_ai_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Check if table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'social_media_hazards'
            )
        """)
        
        if not cur.fetchone()[0]:
            cur.close()
            conn.close()
            return {
                "total_hazards": 0,
                "high_confidence": 0,
                "urgent_alerts": 0,
                "by_source": {},
                "by_hazard_type": {},
                "by_urgency": {},
                "last_updated": None
            }
        
        from datetime import datetime, timedelta
        since_time = datetime.utcnow() - timedelta(hours=hours)
        
        # Total hazards detected (Indian only)
        cur.execute("""
            SELECT COUNT(*) as total 
            FROM social_media_hazards 
            WHERE is_hazard = true AND indian_relevant = true AND analysis_timestamp >= %s
        """, (since_time,))
        total_hazards = cur.fetchone()['total']
        
        # High confidence hazards (Indian only)
        cur.execute("""
            SELECT COUNT(*) as count 
            FROM social_media_hazards 
            WHERE is_hazard = true AND indian_relevant = true AND confidence_score >= 0.7 AND analysis_timestamp >= %s
        """, (since_time,))
        high_confidence = cur.fetchone()['count']
        
        # Urgent alerts (Indian only)
        cur.execute("""
            SELECT COUNT(*) as count 
            FROM social_media_hazards 
            WHERE is_hazard = true AND indian_relevant = true AND urgency_level = 'high' AND analysis_timestamp >= %s
        """, (since_time,))
        urgent_alerts = cur.fetchone()['count']
        
        # By source breakdown (Indian only)
        cur.execute("""
            SELECT source, COUNT(*) as count 
            FROM social_media_hazards 
            WHERE is_hazard = true AND indian_relevant = true AND analysis_timestamp >= %s
            GROUP BY source
        """, (since_time,))
        by_source = {row['source']: row['count'] for row in cur.fetchall()}
        
        # By hazard type (Indian only)
        cur.execute("""
            SELECT hazard_type, COUNT(*) as count 
            FROM social_media_hazards 
            WHERE is_hazard = true AND indian_relevant = true AND analysis_timestamp >= %s
            GROUP BY hazard_type
        """, (since_time,))
        by_hazard_type = {row['hazard_type']: row['count'] for row in cur.fetchall()}
        
        # By urgency level (Indian only)
        cur.execute("""
            SELECT urgency_level, COUNT(*) as count 
            FROM social_media_hazards 
            WHERE is_hazard = true AND indian_relevant = true AND analysis_timestamp >= %s
            GROUP BY urgency_level
        """, (since_time,))
        by_urgency = {row['urgency_level']: row['count'] for row in cur.fetchall()}
        
        # Last update
        cur.execute("""
            SELECT MAX(analysis_timestamp) as last_update 
            FROM social_media_hazards 
            WHERE is_hazard = true
        """)
        last_update_row = cur.fetchone()
        last_updated = last_update_row['last_update'].isoformat() if last_update_row['last_update'] else None
        
        cur.close()
        conn.close()
        
        return {
            "total_hazards": total_hazards,
            "high_confidence": high_confidence,
            "urgent_alerts": urgent_alerts,
            "by_source": by_source,
            "by_hazard_type": by_hazard_type,
            "by_urgency": by_urgency,
            "last_updated": last_updated,
            "time_window_hours": hours
        }
        
    except Exception as e:
        print(f"Error fetching hazard stats: {str(e)}")
        return {
            "total_hazards": 0,
            "high_confidence": 0,
            "urgent_alerts": 0,
            "by_source": {},
            "by_hazard_type": {},
            "by_urgency": {},
            "last_updated": None,
            "error": str(e)
        }
