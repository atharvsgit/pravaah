import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Search, 
  Filter,
  Calendar,
  Users,
  AlertCircle,
  Clock,
  Target,
  Database,
  FileText,
  Activity,
  Brain,
  Zap,
  Shield,
  Globe,
  Hash,
  MessageSquare,
  Star,
  Award,
  Eye,
  Settings,
  RefreshCw,
  ChevronDown,
  Plus,
  X,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  MapPin,
  Layers,
  Code,
  ExternalLink,
  BarChart,
  PieChart,
  LineChart
} from 'lucide-react';

const AnalystDashboard = () => {
  const [activeTab, setActiveTab] = useState('real-time');
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [collapsedPanels, setCollapsedPanels] = useState({});
  const [showEventTypeDropdown, setShowEventTypeDropdown] = useState(false);
  
  // Real-time dashboard state
  const [liveMetrics, setLiveMetrics] = useState({
    activeReports: 24,
    pendingVerifications: 8,
    criticalAlerts: 3,
    systemHealth: 98.5,
    totalUsers: 1247,
    verificationRate: 92.3,
    responseTime: 1.8,
    networkStatus: 'healthy'
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [alertQueue, setAlertQueue] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  
  // Response time metrics state
  const [responseMetrics, setResponseMetrics] = useState({
    avgResponseTime: 25.3,
    criticalDelays: 3,
    reportsProcessed: 142,
    systemEfficiency: 91
  });
  
  const [queryFilters, setQueryFilters] = useState({
    event_types: [],
    keywords: '',
    location: '',
    start_date: '',
    end_date: '',
    status: '',
    min_confidence: 0,
    max_confidence: 100,
    social_media_source: '',
    sentiment: '',
    time_window: '24h'
  });
  
  const [queryResults, setQueryResults] = useState([]);
  const [lagAnalysis, setLagAnalysis] = useState([]);
  const [nlpTrends, setNlpTrends] = useState([]);
  const [socialMediaData, setSocialMediaData] = useState([]);

  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Load data from database
  useEffect(() => {
    // Load comprehensive mock data
    setLagAnalysis([
      { 
        date: '2024-01-15', 
        avg_verification_time_minutes: 45, 
        report_count: 12, 
        hazard_type: 'Tsunami',
        incois_warning_delay: 23,
        first_report_time: '10:15',
        warning_issued_time: '10:38'
      },
      { 
        date: '2024-01-14', 
        avg_verification_time_minutes: 32, 
        report_count: 8, 
        hazard_type: 'High Waves',
        incois_warning_delay: 18,
        first_report_time: '14:22',
        warning_issued_time: '14:40'
      },
      { 
        date: '2024-01-13', 
        avg_verification_time_minutes: 28, 
        report_count: 15, 
        hazard_type: 'Storm Surge',
        incois_warning_delay: 35,
        first_report_time: '09:45',
        warning_issued_time: '10:20'
      }
    ]);
    
    setNlpTrends([
      { 
        keyword: 'tsunami', 
        frequency: 2847, 
        sentiment_score: 8.5, 
        time_period: 'last_24h',
        trend_direction: 'up',
        geographic_spread: ['Chennai', 'Visakhapatnam', 'Mumbai'],
        hashtags: ['#TsunamiAlert', '#CoastalSafety', '#EvacuateNow'],
        misinformation_detected: true
      },
      { 
        keyword: 'flooding', 
        frequency: 1923, 
        sentiment_score: 6.2, 
        time_period: 'last_24h',
        trend_direction: 'stable',
        geographic_spread: ['Kerala', 'Tamil Nadu', 'Odisha'],
        hashtags: ['#CoastalFlooding', '#HighTides', '#SafetyFirst'],
        misinformation_detected: false
      },
      { 
        keyword: 'evacuation', 
        frequency: 1456, 
        sentiment_score: 7.8, 
        time_period: 'last_24h',
        trend_direction: 'up',
        geographic_spread: ['Andhra Pradesh', 'West Bengal'],
        hashtags: ['#Evacuation', '#EmergencyResponse', '#StaySafe'],
        misinformation_detected: false
      },
      { 
        keyword: 'high waves', 
        frequency: 1234, 
        sentiment_score: 5.9, 
        time_period: 'last_24h',
        trend_direction: 'down',
        geographic_spread: ['Goa', 'Karnataka', 'Maharashtra'],
        hashtags: ['#HighWaves', '#BeachSafety', '#MarineWarning'],
        misinformation_detected: true
      }
    ]);

    // Fetch social media data from database
    const fetchSocialMediaData = async () => {
      try {
        // Fetch YouTube alerts count from alerts table
        const youtubeResponse = await fetch('/api/youtube/alerts/count');
        const youtubeData = await youtubeResponse.json();
        
        // Fetch Twitter scraped data count from scraped_data table
        const twitterResponse = await fetch('/api/twitter/scraped-data/count');
        const twitterData = await twitterResponse.json();
        
        setSocialMediaData([
          {
            platform: 'YouTube',
            mentions: youtubeData.count || 0,
            sentiment: 'neutral',
            top_hashtags: ['#TsunamiAlert', '#CoastalSafety', '#EmergencyAlert'],
            verified_accounts: 12,
            misinformation_posts: 8,
            geographic_hotspots: ['Chennai', 'Mumbai', 'Visakhapatnam']
          },
          {
            platform: 'Twitter',
            mentions: twitterData.count || 0,
            sentiment: 'negative',
            top_hashtags: ['#TsunamiAlert', '#CoastalSafety', '#EvacuateNow'],
            verified_accounts: 45,
            misinformation_posts: 23,
            geographic_hotspots: ['Chennai', 'Mumbai', 'Visakhapatnam']
          }
        ]);
      } catch (error) {
        console.error('Error fetching social media data:', error);
        // Fallback to mock data if API fails
        setSocialMediaData([
          {
            platform: 'YouTube',
            mentions: 0,
            sentiment: 'neutral',
            top_hashtags: ['#TsunamiAlert', '#CoastalSafety', '#EmergencyAlert'],
            verified_accounts: 12,
            misinformation_posts: 8,
            geographic_hotspots: ['Chennai', 'Mumbai', 'Visakhapatnam']
          },
          {
            platform: 'Twitter',
            mentions: 0,
            sentiment: 'negative',
            top_hashtags: ['#TsunamiAlert', '#CoastalSafety', '#EvacuateNow'],
            verified_accounts: 45,
            misinformation_posts: 23,
            geographic_hotspots: ['Chennai', 'Mumbai', 'Visakhapatnam']
          }
        ]);
      }
    };
    
    fetchSocialMediaData();


  }, []);

  const handleCustomQuery = async () => {
    setLoading(true);
    // TODO: Implement API call to /api/analyst/query
    setTimeout(() => {
      setQueryResults([
        {
          id: '1',
          user_name: 'John Doe',
          hazard_type: 'High Waves / Swell',
          description: 'Large waves observed near coastline',
          confidence_score: 0.85,
          status: 'verified',
          created_at: '2024-01-15T10:30:00Z'
        },
        {
          id: '2',
          user_name: 'Jane Smith',
          hazard_type: 'Coastal Flooding',
          description: 'Water levels rising in coastal areas',
          confidence_score: 0.72,
          status: 'under_verification',
          created_at: '2024-01-15T09:15:00Z'
        }
      ]);
      setLoading(false);
    }, 1000);
  };

  // Real-time data simulation
  useEffect(() => {
    const updateLiveData = () => {
      // Simulate real-time metrics updates
      setLiveMetrics(prev => ({
        ...prev,
        activeReports: prev.activeReports + Math.floor(Math.random() * 3) - 1,
        pendingVerifications: Math.max(0, prev.pendingVerifications + Math.floor(Math.random() * 3) - 1),
        criticalAlerts: Math.max(0, prev.criticalAlerts + (Math.random() > 0.8 ? 1 : 0)),
        systemHealth: Math.max(95, Math.min(100, prev.systemHealth + (Math.random() - 0.5) * 2)),
        verificationRate: Math.max(85, Math.min(98, prev.verificationRate + (Math.random() - 0.5) * 3)),
        responseTime: Math.max(0.5, Math.min(5, prev.responseTime + (Math.random() - 0.5) * 0.5))
      }));

      // Add recent activity
      const activities = [
        'New tsunami alert verified in Chennai',
        'High wave report flagged for review',
        'Social media spike detected - coastal flooding',
        'User verification completed for Visakhapatnam report',
        'AI model confidence threshold updated',
        'Critical alert escalated to emergency response'
      ];
      
      if (Math.random() > 0.7) {
        setRecentActivity(prev => [
          {
            id: Date.now(),
            message: activities[Math.floor(Math.random() * activities.length)],
            timestamp: new Date().toLocaleTimeString(),
            type: Math.random() > 0.7 ? 'critical' : Math.random() > 0.4 ? 'warning' : 'info'
          },
          ...prev.slice(0, 9)
        ]);
      }

      // Update trend data
      setTrendData(prev => [
        ...prev.slice(-23),
        {
          time: new Date().toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          reports: Math.floor(Math.random() * 15) + 5,
          verifications: Math.floor(Math.random() * 10) + 3,
          alerts: Math.floor(Math.random() * 5)
        }
      ]);

      // Update response metrics
      setResponseMetrics(prev => ({
        avgResponseTime: Math.max(18, Math.min(35, prev.avgResponseTime + (Math.random() - 0.5) * 2)),
        criticalDelays: Math.max(0, Math.min(8, prev.criticalDelays + (Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0))),
        reportsProcessed: prev.reportsProcessed + Math.floor(Math.random() * 3),
        systemEfficiency: Math.max(85, Math.min(98, prev.systemEfficiency + (Math.random() - 0.5) * 2))
      }));
    };

    updateLiveData();
    const interval = setInterval(updateLiveData, 3000); // Update every 3 seconds
    return () => clearInterval(interval);
  }, []);

  // Auto-refresh functionality
  useEffect(() => {
    let intervalId;
    
    if (isAutoRefreshEnabled) {
      intervalId = setInterval(() => {
        setLastRefresh(new Date());
        // Refresh data based on current tab
        if (activeTab === 'query-builder' && queryFilters.keywords) {
          handleQuery();
        } else {
          // Simulate data refresh for other tabs
          setIsLoading(true);
          setTimeout(() => {
            setIsLoading(false);
          }, 500);
        }
      }, refreshInterval * 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAutoRefreshEnabled, refreshInterval, activeTab, queryFilters]);

  const handleExportData = async (format) => {
    // TODO: Implement API call to /api/analyst/export
    const queryString = new URLSearchParams({
      format,
      filters: JSON.stringify(queryFilters)
    }).toString();
    
    // For now, just log the action
    console.log(`Exporting data as ${format} with filters:`, queryFilters);
    
    // In real implementation, this would trigger a download
    alert(`Export initiated for ${format.toUpperCase()} format`);
  };

  const getSentimentColor = (score) => {
    if (score >= 8) return 'text-red-600 bg-red-100';
    if (score >= 6) return 'text-orange-600 bg-orange-100';
    return 'text-yellow-600 bg-yellow-100';
  };

  // Advanced Query Builder Functions
  const handleQuery = async () => {
    setLoading(true);
    
    try {
      // Simulate API call with current filter values
      const activeFilters = Object.entries(queryFilters).filter(([key, value]) => {
        if (Array.isArray(value)) return value.length > 0;
        return value && value !== '';
      });

      // Mock query results based on filters
      const mockResults = [
        {
          id: '1',
          user_name: 'Coastal Observer',
          hazard_type: queryFilters.keywords ? 'Tsunami' : 'High Waves',
          description: queryFilters.keywords ? 
            `Report matching "${queryFilters.keywords}": Unusual wave patterns observed near coastline with significant retreat` : 
            'Large waves observed near coastline with significant impact on coastal structures',
          confidence_score: queryFilters.min_confidence ? (queryFilters.min_confidence / 100) + 0.1 : 0.89,
          status: queryFilters.status || 'verified',
          created_at: queryFilters.start_date ? `${queryFilters.start_date}T10:30:00Z` : '2024-01-15T10:30:00Z',
          location: queryFilters.location || 'Chennai Coast',
          social_source: queryFilters.social_media_source || 'twitter',
          sentiment: queryFilters.sentiment || 'negative',
          priority: 'high'
        },
        {
          id: '2',
          user_name: 'Marine Safety Team',
          hazard_type: 'Coastal Flooding',
          description: queryFilters.location ? 
            `Water levels rising in ${queryFilters.location} area with potential flooding risks` : 
            'Water levels rising in coastal areas with potential infrastructure damage',
          confidence_score: 0.76,
          status: queryFilters.status || 'under_verification',
          created_at: queryFilters.end_date ? `${queryFilters.end_date}T09:15:00Z` : '2024-01-15T09:15:00Z',
          location: queryFilters.location || 'Mumbai Harbor',
          social_source: 'instagram',
          sentiment: 'neutral',
          priority: 'medium'
        },
        {
          id: '3',
          user_name: 'Fisherman Report',
          hazard_type: 'Rip Currents',
          description: 'Strong undercurrents detected by fishing vessels, advising caution for water activities',
          confidence_score: 0.68,
          status: 'flagged',
          created_at: '2024-01-14T16:45:00Z',
          location: 'Visakhapatnam Beach',
          social_source: 'telegram',
          sentiment: 'negative',
          priority: 'low'
        }
      ];

      // Filter results based on criteria
      let filteredResults = mockResults;
      
      if (queryFilters.keywords) {
        filteredResults = filteredResults.filter(r => 
          r.description.toLowerCase().includes(queryFilters.keywords.toLowerCase()) ||
          r.hazard_type.toLowerCase().includes(queryFilters.keywords.toLowerCase())
        );
      }

      if (queryFilters.status) {
        filteredResults = filteredResults.filter(r => r.status === queryFilters.status);
      }

      if (queryFilters.location) {
        filteredResults = filteredResults.filter(r => 
          r.location.toLowerCase().includes(queryFilters.location.toLowerCase())
        );
      }

      if (queryFilters.social_media_source) {
        filteredResults = filteredResults.filter(r => r.social_source === queryFilters.social_media_source);
      }

      if (queryFilters.sentiment) {
        filteredResults = filteredResults.filter(r => r.sentiment === queryFilters.sentiment);
      }

      // Apply confidence score filtering
      if (queryFilters.min_confidence > 0) {
        filteredResults = filteredResults.filter(r => 
          (r.confidence_score * 100) >= queryFilters.min_confidence
        );
      }

      setQueryResults(filteredResults);
      
    } catch (error) {
      console.error('Query failed:', error);
      alert('Query failed. Please check your filters and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setQueryFilters({
      event_types: [],
      keywords: '',
      location: '',
      start_date: '',
      end_date: '',
      status: '',
      min_confidence: 0,
      max_confidence: 100,
      social_media_source: '',
      sentiment: '',
      time_window: '24h'
    });
    setQueryResults([]);
    setShowEventTypeDropdown(false);
  };

  const handlePresetQuery = (preset) => {
    let newFilters = { ...queryFilters };
    
    switch (preset) {
      case 'high-confidence':
        newFilters = {
          ...newFilters,
          min_confidence: 80,
          status: 'verified'
        };
        break;
      case 'last-24h':
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        newFilters = {
          ...newFilters,
          start_date: yesterday.toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0]
        };
        break;
      case 'tsunami-alerts':
        newFilters = {
          ...newFilters,
          keywords: 'tsunami',
          status: 'verified',
          min_confidence: 70
        };
        break;
      case 'social-media':
        newFilters = {
          ...newFilters,
          social_media_source: 'twitter'
        };
        break;
      case 'flagged-content':
        newFilters = {
          ...newFilters,
          status: 'flagged'
        };
        break;
      default:
        break;
    }
    
    setQueryFilters(newFilters);
    // Auto-run query after applying preset
    setTimeout(() => handleQuery(), 100);
  };

  const handleEventTypeToggle = (eventType) => {
    const currentTypes = queryFilters.event_types || [];
    const updatedTypes = currentTypes.includes(eventType)
      ? currentTypes.filter(type => type !== eventType)
      : [...currentTypes, eventType];
    
    setQueryFilters({
      ...queryFilters,
      event_types: updatedTypes
    });
  };

  const removeKeyword = () => {
    setQueryFilters({
      ...queryFilters,
      keywords: ''
    });
  };

  // Auto-search when keywords change
  useEffect(() => {
    if (queryFilters.keywords && queryFilters.keywords.length > 2) {
      const debounceTimer = setTimeout(() => {
        handleQuery();
      }, 500); // Debounce for 500ms
      
      return () => clearTimeout(debounceTimer);
    } else if (queryFilters.keywords === '') {
      setQueryResults([]);
    }
  }, [queryFilters.keywords]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showEventTypeDropdown && !event.target.closest('.event-type-dropdown')) {
        setShowEventTypeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEventTypeDropdown]);

  const togglePanel = (panelId) => {
    setCollapsedPanels(prev => ({
      ...prev,
      [panelId]: !prev[panelId]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-xl flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                <Brain className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">Advanced Analytics Hub</h1>
                <p className="text-gray-600 mt-1 text-sm sm:text-base hidden sm:block">Deep insights into ocean hazard data and social media intelligence</p>
              </div>
            </div>
            
            {/* Mobile Menu Button */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden bg-white hover:bg-gray-50 text-gray-700 p-2 rounded-lg border shadow-sm transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
              
              {/* Desktop Controls */}
              <div className="hidden lg:flex items-center space-x-3">
              {/* Auto-refresh controls */}
              <div className="flex items-center space-x-2 bg-white rounded-lg px-3 py-2 border">
                <button
                  onClick={() => setIsAutoRefreshEnabled(!isAutoRefreshEnabled)}
                  className={`flex items-center space-x-2 px-3 py-1 rounded-md transition-colors ${
                    isAutoRefreshEnabled 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${isAutoRefreshEnabled && isLoading ? 'animate-spin' : ''}`} />
                  <span className="text-sm font-medium">
                    {isAutoRefreshEnabled ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                  </span>
                </button>
                
                {isAutoRefreshEnabled && (
                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                    className="text-sm border-0 bg-transparent focus:ring-0"
                  >
                    <option value={10}>10s</option>
                    <option value={30}>30s</option>
                    <option value={60}>1m</option>
                    <option value={300}>5m</option>
                  </select>
                )}
                
                <div className="text-xs text-gray-500 border-l pl-2">
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </div>
              </div>
                <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  API Access
                </button>
              </div>
            </div>
          </div>
          
          {/* Mobile Controls Menu */}
          {isMobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-200 mt-4 pt-4">
              <div className="space-y-3">
                {/* Auto-refresh controls for mobile */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Auto-refresh</span>
                  <button
                    onClick={() => setIsAutoRefreshEnabled(!isAutoRefreshEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isAutoRefreshEnabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isAutoRefreshEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                {isAutoRefreshEnabled && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Interval</span>
                    <select
                      value={refreshInterval}
                      onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                      className="text-sm border border-gray-300 rounded-md px-2 py-1"
                    >
                      <option value={10}>10s</option>
                      <option value={30}>30s</option>
                      <option value={60}>1m</option>
                      <option value={300}>5m</option>
                    </select>
                  </div>
                )}
                
                <div className="flex flex-col space-y-2">
                  <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center">
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </button>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center">
                    <Code className="w-4 h-4 mr-2" />
                    Export JSON
                  </button>
                  <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    API Access
                  </button>
                </div>
                
                <div className="text-xs text-gray-500 text-center pt-2 border-t">
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Model Accuracy</p>
                <p className="text-3xl font-bold text-gray-900">87.3%</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Target className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-2">
              <ArrowUpRight className="w-4 h-4 text-green-500 inline mr-1" />
              <span className="text-sm text-green-600">+2.3% from last week</span>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-3xl font-bold text-gray-900">2.3s</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-2">
              <ArrowDownRight className="w-4 h-4 text-green-500 inline mr-1" />
              <span className="text-sm text-green-600">-0.8s improvement</span>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Data Quality</p>
                <p className="text-3xl font-bold text-gray-900">92.1%</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-2">
              <ArrowUpRight className="w-4 h-4 text-green-500 inline mr-1" />
              <span className="text-sm text-green-600">High quality data</span>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">API Uptime</p>
                <p className="text-3xl font-bold text-gray-900">99.7%</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-2">
              <Activity className="w-4 h-4 text-green-500 inline mr-1" />
              <span className="text-sm text-green-600">System healthy</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-4 sm:mb-8">
          {/* Mobile Tab Selector */}
          <div className="sm:hidden">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="block w-full border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="real-time">📊 Live Dashboard</option>
              <option value="advanced-analytics">📈 Advanced Analytics</option>
              <option value="alert-management">🚨 Alert Center</option>
              <option value="query-builder">🔍 Advanced Query Builder</option>
              <option value="lag-analysis">⏱️ Response Time Analysis</option>
              <option value="nlp-dashboard">🧠 Social Media Intelligence</option>
              <option value="export-api">📤 Data Export & API</option>
            </select>
          </div>
          
          {/* Desktop Tab Navigation */}
          <nav className="hidden sm:flex -mb-px w-full px-4 overflow-x-auto">
            <div className="flex space-x-6 min-w-max">
              {[
                { id: 'real-time', name: 'Live Dashboard', shortName: 'Live', icon: Activity },
                { id: 'advanced-analytics', name: 'Advanced Analytics', shortName: 'Analytics', icon: TrendingUp },
                { id: 'alert-management', name: 'Alert Center', shortName: 'Alerts', icon: AlertCircle },
                { id: 'query-builder', name: 'Query Builder', shortName: 'Query', icon: Search },
                { id: 'lag-analysis', name: 'Response Time', shortName: 'Time', icon: Clock },
                { id: 'nlp-dashboard', name: 'Social Media', shortName: 'Social', icon: Brain },
                { id: 'export-api', name: 'Export & API', shortName: 'Export', icon: Download }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="hidden lg:inline">{tab.name}</span>
                  <span className="lg:hidden">{tab.shortName}</span>
                </button>
              ))}
            </div>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {/* Real-time Dashboard */}
          {activeTab === 'real-time' && (
            <div className="space-y-6">
              {/* Live Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active Reports</p>
                      <p className="text-2xl font-bold text-gray-900">{liveMetrics.activeReports}</p>
                    </div>
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center text-sm">
                    <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-green-600">+12% from yesterday</span>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pending Reviews</p>
                      <p className="text-2xl font-bold text-gray-900">{liveMetrics.pendingVerifications}</p>
                    </div>
                    <div className="bg-yellow-100 p-2 rounded-lg">
                      <Clock className="w-5 h-5 text-yellow-600" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center text-sm">
                    <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
                    <span className="text-red-600">-8% from yesterday</span>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Critical Alerts</p>
                      <p className="text-2xl font-bold text-red-600">{liveMetrics.criticalAlerts}</p>
                    </div>
                    <div className="bg-red-100 p-2 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center text-sm">
                    <span className="text-orange-600">Requires immediate attention</span>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">System Health</p>
                      <p className="text-2xl font-bold text-green-600">{liveMetrics.systemHealth.toFixed(1)}%</p>
                    </div>
                    <div className="bg-green-100 p-2 rounded-lg">
                      <Shield className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center text-sm">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${liveMetrics.systemHealth}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-time Activity Feed & Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Activity Feed */}
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Activity className="w-5 h-5 mr-2" />
                      Live Activity Feed
                    </h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="p-4 border-b border-gray-100 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className={`w-2 h-2 rounded-full mt-2 ${
                              activity.type === 'critical' ? 'bg-red-500' :
                              activity.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                            }`}></div>
                            <div>
                              <p className="text-sm text-gray-900">{activity.message}</p>
                              <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            activity.type === 'critical' ? 'bg-red-100 text-red-700' :
                            activity.type === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {activity.type}
                          </span>
                        </div>
                      </div>
                    ))}
                    {recentActivity.length === 0 && (
                      <div className="p-8 text-center text-gray-500">
                        <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>Waiting for activity...</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Real-time Trend Chart */}
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Live Trends (Last 24 Points)
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="h-64 flex items-end justify-between space-x-1">
                      {trendData.slice(-24).map((point, index) => (
                        <div key={index} className="flex flex-col items-center flex-1">
                          <div className="flex flex-col items-center space-y-1 mb-2">
                            <div 
                              className="bg-blue-500 rounded-t"
                              style={{ 
                                height: `${Math.max(point.reports * 8, 4)}px`,
                                width: '100%',
                                maxWidth: '12px'
                              }}
                            ></div>
                            <div 
                              className="bg-green-500 rounded-t"
                              style={{ 
                                height: `${Math.max(point.verifications * 12, 4)}px`,
                                width: '100%',
                                maxWidth: '12px'
                              }}
                            ></div>
                            <div 
                              className="bg-red-500 rounded-t"
                              style={{ 
                                height: `${Math.max(point.alerts * 20, 4)}px`,
                                width: '100%',
                                maxWidth: '12px'
                              }}
                            ></div>
                          </div>
                          <div className="h-4 w-full overflow-hidden relative">
                            <span className="text-xs text-gray-500 absolute whitespace-nowrap" 
                                  style={{ 
                                    transform: 'rotate(-45deg) translate(-50%, 0)',
                                    transformOrigin: 'top left',
                                    fontSize: '8px',
                                    left: '50%',
                                    top: '0'
                                  }}>
                              {point.time}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-center space-x-4 mt-4 text-sm">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                        <span>Reports</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                        <span>Verifications</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
                        <span>Alerts</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Zap className="w-5 h-5 mr-2" />
                    Quick Actions
                  </h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors">
                      <AlertCircle className="w-6 h-6 text-red-500 mb-2" />
                      <p className="font-medium text-gray-900">View Critical Alerts</p>
                      <p className="text-sm text-gray-500">{liveMetrics.criticalAlerts} pending</p>
                    </button>
                    <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors">
                      <Users className="w-6 h-6 text-blue-500 mb-2" />
                      <p className="font-medium text-gray-900">Manage Users</p>
                      <p className="text-sm text-gray-500">{liveMetrics.totalUsers} active</p>
                    </button>
                    <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors">
                      <BarChart3 className="w-6 h-6 text-green-500 mb-2" />
                      <p className="font-medium text-gray-900">Performance Metrics</p>
                      <p className="text-sm text-gray-500">{liveMetrics.verificationRate.toFixed(1)}% accuracy</p>
                    </button>
                    <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors">
                      <Globe className="w-6 h-6 text-purple-500 mb-2" />
                      <p className="font-medium text-gray-900">System Status</p>
                      <p className="text-sm text-gray-500">{liveMetrics.networkStatus}</p>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Query Builder */}
          {activeTab === 'query-builder' && (
            <div className="space-y-6">
              {/* Query Builder Controls */}
              <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                      <Search className="w-5 h-5 mr-2" />
                      Advanced Query Builder
                    </h2>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => {
                          const queryName = prompt('Enter query name:');
                          if (queryName) {
                            localStorage.setItem(`query_${queryName}`, JSON.stringify(queryFilters));
                            alert(`Query "${queryName}" saved successfully!`);
                          }
                        }}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-lg text-sm transition-colors flex items-center"
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Save Query
                      </button>
                      <button 
                        onClick={() => {
                          const savedQueries = Object.keys(localStorage).filter(key => key.startsWith('query_'));
                          if (savedQueries.length === 0) {
                            alert('No saved queries found.');
                            return;
                          }
                          const queryNames = savedQueries.map(key => key.replace('query_', ''));
                          const selectedQuery = prompt(`Select query to load:\n${queryNames.join(', ')}`);
                          if (selectedQuery) {
                            const savedQuery = localStorage.getItem(`query_${selectedQuery}`);
                            if (savedQuery) {
                              setQueryFilters(JSON.parse(savedQuery));
                              alert(`Query "${selectedQuery}" loaded successfully!`);
                            } else {
                              alert('Query not found.');
                            }
                          }
                        }}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-lg text-sm transition-colors flex items-center"
                      >
                        <Layers className="w-4 h-4 mr-1" />
                        Load Template
                      </button>
                      <button 
                        onClick={handleClearFilters}
                        className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-lg text-sm transition-colors flex items-center"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Clear All
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-600 mt-2">Build complex queries with real-time filtering, date ranges, and multi-criteria search.</p>
                </div>
              
                <div className="p-6 space-y-6">
                  {/* Primary Filters Row */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Multi-select Event Types */}
                    <div className="relative event-type-dropdown">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Event Types</label>
                      <div className="relative">
                        <button 
                          onClick={() => setShowEventTypeDropdown(!showEventTypeDropdown)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-left focus:ring-2 focus:ring-blue-500 bg-white flex items-center justify-between"
                        >
                          <span className="text-gray-700">
                            {queryFilters.event_types.length > 0 
                              ? `${queryFilters.event_types.length} type${queryFilters.event_types.length > 1 ? 's' : ''} selected`
                              : 'Select types...'
                            }
                          </span>
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showEventTypeDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        {showEventTypeDropdown && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                            <div className="p-2 space-y-1">
                              {['Tsunami', 'High Waves', 'Coastal Flooding', 'Storm Surge', 'Rip Currents', 'Cyclone'].map((type) => (
                                <label key={type} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    className="mr-2 text-blue-600"
                                    checked={queryFilters.event_types.includes(type)}
                                    onChange={() => handleEventTypeToggle(type)}
                                  />
                                  <span className="text-sm">{type}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Real-time Search Keywords */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Keywords</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                          type="text" 
                          placeholder="Type to search..." 
                          className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                          value={queryFilters.keywords}
                          onChange={(e) => setQueryFilters({...queryFilters, keywords: e.target.value})}
                        />
                      </div>
                      {queryFilters.keywords && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            {queryFilters.keywords}
                            <button 
                              onClick={removeKeyword}
                              className="ml-1 hover:text-blue-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Smart Location Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                          type="text" 
                          placeholder="City, state, coordinates..." 
                          className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                          value={queryFilters.location}
                          onChange={(e) => setQueryFilters({...queryFilters, location: e.target.value})}
                        />
                      </div>
                    </div>

                    {/* Status Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Report Status</label>
                      <select 
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                        value={queryFilters.status}
                        onChange={(e) => setQueryFilters({...queryFilters, status: e.target.value})}
                      >
                        <option value="">All Statuses</option>
                        <option value="verified">Verified</option>
                        <option value="under_verification">Under Verification</option>
                        <option value="flagged">Flagged</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  </div>

                  {/* Advanced Filters Row */}
                  <div className="border-t pt-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
                      <Filter className="w-4 h-4 mr-2" />
                      Advanced Filters
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      {/* Date Range Picker */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                        <div className="flex space-x-2">
                          <div className="relative flex-1">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                              type="date" 
                              className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                              value={queryFilters.start_date}
                              onChange={(e) => setQueryFilters({...queryFilters, start_date: e.target.value})}
                            />
                          </div>
                          <div className="flex items-center text-gray-400">to</div>
                          <div className="relative flex-1">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                              type="date" 
                              className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                              value={queryFilters.end_date}
                              onChange={(e) => setQueryFilters({...queryFilters, end_date: e.target.value})}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Confidence Score Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Confidence Score</label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500 w-8">Min:</span>
                            <input 
                              type="range" 
                              min="0" 
                              max="100" 
                              className="flex-1"
                              value={queryFilters.min_confidence}
                              onChange={(e) => setQueryFilters({...queryFilters, min_confidence: parseInt(e.target.value)})}
                            />
                            <span className="text-xs text-gray-700 w-8">{queryFilters.min_confidence}%</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500 w-8">Max:</span>
                            <input 
                              type="range" 
                              min="0" 
                              max="100" 
                              className="flex-1"
                              value={queryFilters.max_confidence}
                              onChange={(e) => setQueryFilters({...queryFilters, max_confidence: parseInt(e.target.value)})}
                            />
                            <span className="text-xs text-gray-700 w-8">{queryFilters.max_confidence}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Social Media Source */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Social Source</label>
                        <select 
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                          value={queryFilters.social_media_source}
                          onChange={(e) => setQueryFilters({...queryFilters, social_media_source: e.target.value})}
                        >
                          <option value="">All Sources</option>
                          <option value="twitter">Twitter</option>
                          <option value="facebook">Facebook</option>
                          <option value="instagram">Instagram</option>
                          <option value="telegram">Telegram</option>
                        </select>
                      </div>

                      {/* Sentiment */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Sentiment</label>
                        <select 
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                          value={queryFilters.sentiment}
                          onChange={(e) => setQueryFilters({...queryFilters, sentiment: e.target.value})}
                        >
                          <option value="">All Sentiments</option>
                          <option value="positive">Positive</option>
                          <option value="neutral">Neutral</option>
                          <option value="negative">Negative</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Quick Presets */}
                  <div className="border-t pt-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-4">Quick Presets</h3>
                    <div className="flex flex-wrap gap-2">
                      <button 
                        onClick={() => handlePresetQuery('high-confidence')}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
                      >
                        High Confidence Reports
                      </button>
                      <button 
                        onClick={() => handlePresetQuery('last-24h')}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm hover:bg-green-200 transition-colors"
                      >
                        Last 24 Hours
                      </button>
                      <button 
                        onClick={() => handlePresetQuery('tsunami-alerts')}
                        className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm hover:bg-purple-200 transition-colors"
                      >
                        Tsunami Alerts
                      </button>
                      <button 
                        onClick={() => handlePresetQuery('social-media')}
                        className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm hover:bg-orange-200 transition-colors"
                      >
                        Social Media Mentions
                      </button>
                      <button 
                        onClick={() => handlePresetQuery('flagged-content')}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm hover:bg-red-200 transition-colors"
                      >
                        Flagged Content
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between items-center pt-6 border-t">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Activity className="w-4 h-4" />
                      <span>Active filters: {Object.values(queryFilters).filter(v => v && v !== '').length}</span>
                    </div>
                    <div className="flex space-x-3">
                      <button 
                        onClick={handleQuery}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium flex items-center transition-colors"
                      >
                        {loading ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4 mr-2" />
                        )}
                        {loading ? 'Running Query...' : `Run Query (${queryResults.length} results)`}
                      </button>
                      <button 
                        onClick={() => handleExportData('json')}
                        disabled={queryResults.length === 0}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium flex items-center transition-colors"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Query Results */}
              {queryResults.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <Database className="w-5 h-5 mr-2" />
                        Query Results ({queryResults.length} found)
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>
                          Verified: {queryResults.filter(r => r.status === 'verified').length}
                        </span>
                        <span>
                          Avg Confidence: {Math.round(queryResults.reduce((acc, r) => acc + (r.confidence_score * 100), 0) / queryResults.length)}%
                        </span>
                        <span>
                          High Priority: {queryResults.filter(r => r.priority === 'high').length}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {queryResults.map((result) => (
                      <div key={result.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center flex-wrap gap-2 mb-2">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                {result.hazard_type}
                              </span>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                result.status === 'verified' 
                                  ? 'bg-green-100 text-green-800'
                                  : result.status === 'under_verification'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {result.status.replace('_', ' ')}
                              </span>
                              {result.priority && (
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  result.priority === 'high' 
                                    ? 'bg-red-100 text-red-800'
                                    : result.priority === 'medium'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {result.priority} priority
                                </span>
                              )}
                              <span className="text-xs text-gray-500">
                                by {result.user_name}
                              </span>
                              {result.social_source && (
                                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                                  {result.social_source}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-900 mb-2">{result.description}</p>
                            <div className="flex items-center justify-between text-sm text-gray-500">
                              <div className="flex items-center space-x-4">
                                <span>{new Date(result.created_at).toLocaleString()}</span>
                                {result.location && (
                                  <span className="flex items-center">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    {result.location}
                                  </span>
                                )}
                                {result.sentiment && (
                                  <span className={`flex items-center px-2 py-1 rounded-full text-xs ${
                                    result.sentiment === 'positive' 
                                      ? 'bg-green-100 text-green-700'
                                      : result.sentiment === 'negative'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {result.sentiment}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 ml-4">
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">
                                {Math.round(result.confidence_score * 100)}%
                              </div>
                              <div className="text-xs text-gray-500">confidence</div>
                            </div>
                            <button className="text-gray-400 hover:text-gray-600">
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Advanced Analytics Tab */}
          {activeTab === 'advanced-analytics' && (
            <div className="space-y-6">
              {/* Trend Detection */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Trend Detection & Pattern Analysis
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Trend Patterns */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-4">Detected Patterns</h4>
                      <div className="space-y-3">
                        <div className="p-3 border border-orange-200 rounded-lg bg-orange-50">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-orange-800">Seasonal Tsunami Alerts</span>
                            <span className="text-sm text-orange-600">↗ +23% increase</span>
                          </div>
                          <p className="text-sm text-orange-700 mt-1">Monthly pattern detected during monsoon season</p>
                        </div>
                        <div className="p-3 border border-blue-200 rounded-lg bg-blue-50">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-blue-800">Social Media Spikes</span>
                            <span className="text-sm text-blue-600">📊 Strong correlation</span>
                          </div>
                          <p className="text-sm text-blue-700 mt-1">Social mentions precede official reports by avg 18 minutes</p>
                        </div>
                        <div className="p-3 border border-green-200 rounded-lg bg-green-50">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-green-800">Verification Efficiency</span>
                            <span className="text-sm text-green-600">⚡ Peak performance</span>
                          </div>
                          <p className="text-sm text-green-700 mt-1">Response times optimal between 10AM-2PM</p>
                        </div>
                      </div>
                    </div>

                    {/* Predictive Insights */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-4">Predictive Insights</h4>
                      <div className="space-y-4">
                        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border">
                          <div className="flex items-center mb-2">
                            <Brain className="w-5 h-5 text-purple-600 mr-2" />
                            <span className="font-medium text-purple-800">AI Forecast</span>
                          </div>
                          <p className="text-sm text-purple-700 mb-3">
                            Based on current patterns, expect 15-20% increase in coastal reports over next 72 hours
                          </p>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-purple-600">Confidence: 87%</span>
                            <span className="text-purple-600">Next Update: 2 hours</span>
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border">
                          <div className="flex items-center mb-2">
                            <Target className="w-5 h-5 text-orange-600 mr-2" />
                            <span className="font-medium text-orange-800">Risk Assessment</span>
                          </div>
                          <p className="text-sm text-orange-700 mb-3">
                            High probability of false positives in social media data during peak hours (6-9 PM)
                          </p>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-orange-600">Risk Level: Medium</span>
                            <span className="text-orange-600">Monitor closely</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Anomaly Detection */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    Anomaly Detection
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                        <span className="font-medium text-red-800">Critical Anomaly</span>
                      </div>
                      <p className="text-sm text-red-700 mb-2">
                        Unusual spike in tsunami reports from Chennai area - 3x normal volume
                      </p>
                      <div className="text-xs text-red-600">
                        Detected: 2 hours ago | Severity: High
                      </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                        <span className="font-medium text-yellow-800">Pattern Deviation</span>
                      </div>
                      <p className="text-sm text-yellow-700 mb-2">
                        Social media sentiment unusually negative - potential misinformation spread
                      </p>
                      <div className="text-xs text-yellow-600">
                        Detected: 45 min ago | Severity: Medium
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                        <span className="font-medium text-blue-800">Performance Anomaly</span>
                      </div>
                      <p className="text-sm text-blue-700 mb-2">
                        Verification response time 40% slower than usual during peak hours
                      </p>
                      <div className="text-xs text-blue-600">
                        Detected: 1 hour ago | Severity: Low
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Metrics Dashboard */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Correlation Analysis */}
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <BarChart className="w-5 h-5 mr-2" />
                      Data Correlations
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Social Media vs Official Reports</span>
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div className="bg-green-600 h-2 rounded-full" style={{ width: '78%' }}></div>
                          </div>
                          <span className="text-sm font-medium text-green-600">78%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Weather Data vs Hazard Reports</span>
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '92%' }}></div>
                          </div>
                          <span className="text-sm font-medium text-blue-600">92%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">User Reputation vs Accuracy</span>
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div className="bg-purple-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                          </div>
                          <span className="text-sm font-medium text-purple-600">85%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Trends */}
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <LineChart className="w-5 h-5 mr-2" />
                      Performance Trends
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <p className="font-medium text-green-800">Model Accuracy</p>
                          <p className="text-sm text-green-600">7-day average</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-700">94.2%</p>
                          <p className="text-sm text-green-600">↗ +2.1%</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div>
                          <p className="font-medium text-blue-800">Response Time</p>
                          <p className="text-sm text-blue-600">Average minutes</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-700">18.5</p>
                          <p className="text-sm text-blue-600">↘ -1.8min</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <div>
                          <p className="font-medium text-purple-800">Data Quality</p>
                          <p className="text-sm text-purple-600">Overall score</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-purple-700">96.8%</p>
                          <p className="text-sm text-purple-600">↗ +0.5%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Alert Management System */}
          {activeTab === 'alert-management' && (
            <div className="space-y-6">
              {/* Alert Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Critical Alerts</p>
                      <p className="text-2xl font-bold text-red-600">{liveMetrics.criticalAlerts}</p>
                    </div>
                    <div className="bg-red-100 p-2 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                  </div>
                  <p className="text-sm text-red-600 mt-1">Requires immediate action</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">High Priority</p>
                      <p className="text-2xl font-bold text-orange-600">12</p>
                    </div>
                    <div className="bg-orange-100 p-2 rounded-lg">
                      <Star className="w-5 h-5 text-orange-600" />
                    </div>
                  </div>
                  <p className="text-sm text-orange-600 mt-1">Review within 1 hour</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Medium Priority</p>
                      <p className="text-2xl font-bold text-yellow-600">28</p>
                    </div>
                    <div className="bg-yellow-100 p-2 rounded-lg">
                      <Clock className="w-5 h-5 text-yellow-600" />
                    </div>
                  </div>
                  <p className="text-sm text-yellow-600 mt-1">Review within 4 hours</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Resolved Today</p>
                      <p className="text-2xl font-bold text-green-600">47</p>
                    </div>
                    <div className="bg-green-100 p-2 rounded-lg">
                      <Shield className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                  <p className="text-sm text-green-600 mt-1">+18% from yesterday</p>
                </div>
              </div>

              {/* Priority Alert Queue */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    Priority Alert Queue
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                      Show Critical Only
                    </button>
                    <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                      Bulk Actions
                    </button>
                  </div>
                </div>
                <div className="divide-y divide-gray-200">
                  {[
                    {
                      id: 1,
                      type: 'Tsunami Warning',
                      location: 'Chennai Coast',
                      severity: 'critical',
                      time: '2 minutes ago',
                      description: 'Multiple reports of unusual wave activity',
                      source: 'Social Media + User Reports',
                      confidence: 92
                    },
                    {
                      id: 2,
                      type: 'Coastal Flooding',
                      location: 'Mumbai Harbor',
                      severity: 'high',
                      time: '15 minutes ago',
                      description: 'Rising water levels in harbor area',
                      source: 'Sensor Network',
                      confidence: 87
                    },
                    {
                      id: 3,
                      type: 'High Waves',
                      location: 'Visakhapatnam',
                      severity: 'high',
                      time: '28 minutes ago',
                      description: 'Fishermen report dangerous wave conditions',
                      source: 'Official Report',
                      confidence: 95
                    },
                    {
                      id: 4,
                      type: 'Storm Surge',
                      location: 'Kochi',
                      severity: 'medium',
                      time: '45 minutes ago',
                      description: 'Potential storm surge threat identified',
                      source: 'Weather Station',
                      confidence: 78
                    }
                  ].map((alert) => (
                    <div key={alert.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                              alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {alert.severity.toUpperCase()}
                            </span>
                            <span className="font-medium text-gray-900">{alert.type}</span>
                            <span className="text-sm text-gray-500">• {alert.location}</span>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{alert.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>Source: {alert.source}</span>
                            <span>Confidence: {alert.confidence}%</span>
                            <span>{alert.time}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                            Investigate
                          </button>
                          <button className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                            Verify
                          </button>
                          <button className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alert Response Teams */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Response Team Status */}
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      Response Team Status
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                          <div>
                            <p className="font-medium text-green-800">Chennai Team</p>
                            <p className="text-sm text-green-600">Available - 4 analysts</p>
                          </div>
                        </div>
                        <span className="text-sm text-green-600">Active</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                          <div>
                            <p className="font-medium text-yellow-800">Mumbai Team</p>
                            <p className="text-sm text-yellow-600">Busy - 2 analysts</p>
                          </div>
                        </div>
                        <span className="text-sm text-yellow-600">Busy</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                          <div>
                            <p className="font-medium text-blue-800">Kochi Team</p>
                            <p className="text-sm text-blue-600">Available - 3 analysts</p>
                          </div>
                        </div>
                        <span className="text-sm text-blue-600">Active</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Escalation Protocols */}
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Target className="w-5 h-5 mr-2" />
                      Escalation Protocols
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="space-y-4">
                      <div className="border border-red-200 rounded-lg p-3 bg-red-50">
                        <div className="flex items-center mb-2">
                          <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                          <span className="font-medium text-red-800">Level 1 - Critical</span>
                        </div>
                        <p className="text-sm text-red-700">
                          Immediate escalation to INCOIS and emergency services within 5 minutes
                        </p>
                      </div>
                      
                      <div className="border border-orange-200 rounded-lg p-3 bg-orange-50">
                        <div className="flex items-center mb-2">
                          <Star className="w-4 h-4 text-orange-600 mr-2" />
                          <span className="font-medium text-orange-800">Level 2 - High</span>
                        </div>
                        <p className="text-sm text-orange-700">
                          Senior analyst review within 30 minutes, possible public advisory
                        </p>
                      </div>
                      
                      <div className="border border-yellow-200 rounded-lg p-3 bg-yellow-50">
                        <div className="flex items-center mb-2">
                          <Clock className="w-4 h-4 text-yellow-600 mr-2" />
                          <span className="font-medium text-yellow-800">Level 3 - Medium</span>
                        </div>
                        <p className="text-sm text-yellow-700">
                          Standard verification process within 2 hours, team review
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Communication Center */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Communication Center
                  </h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                      <Globe className="w-6 h-6 text-blue-500 mb-2" />
                      <p className="font-medium text-gray-900">Send Public Alert</p>
                      <p className="text-sm text-gray-500">Broadcast to affected regions</p>
                    </button>
                    
                    <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                      <Users className="w-6 h-6 text-green-500 mb-2" />
                      <p className="font-medium text-gray-900">Notify Teams</p>
                      <p className="text-sm text-gray-500">Alert response teams</p>
                    </button>
                    
                    <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                      <Shield className="w-6 h-6 text-red-500 mb-2" />
                      <p className="font-medium text-gray-900">Emergency Protocol</p>
                      <p className="text-sm text-gray-500">Activate emergency response</p>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Response Time Analysis Tab */}
          {activeTab === 'lag-analysis' && (
            <div className="space-y-6">
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Avg Response Time</p>
                      <p className="text-3xl font-bold text-blue-600">{responseMetrics.avgResponseTime.toFixed(1)}s</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <ArrowDownRight className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600">12% faster than last week</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Critical Delays</p>
                      <p className="text-3xl font-bold text-red-600">{responseMetrics.criticalDelays}</p>
                    </div>
                    <div className="p-3 bg-red-100 rounded-full">
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <ArrowUpRight className="w-4 h-4 text-red-500 mr-1" />
                    <span className="text-sm text-red-600">2 more than yesterday</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Reports Processed</p>
                      <p className="text-3xl font-bold text-green-600">{responseMetrics.reportsProcessed}</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <FileText className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600">8% increase</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">System Efficiency</p>
                      <p className="text-3xl font-bold text-purple-600">{responseMetrics.systemEfficiency.toFixed(1)}%</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <Target className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600">5% improvement</span>
                  </div>
                </div>
              </div>

              {/* Interactive Chart Visualization */}
              <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                      <BarChart className="w-5 h-5 mr-2" />
                      Interactive Response Time Trends
                    </h2>
                    <div className="flex space-x-2">
                      <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors">
                        7 Days
                      </button>
                      <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                        30 Days
                      </button>
                      <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                        90 Days
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  {/* Simulated Chart Area */}
                  <div className="h-80 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg flex items-center justify-center relative overflow-hidden">
                    {/* Chart Background Grid */}
                    <div className="absolute inset-0 opacity-20">
                      <div className="h-full w-full" style={{
                        backgroundImage: `linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                                         linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)`,
                        backgroundSize: '40px 40px'
                      }}></div>
                    </div>
                    
                    {/* Simulated Chart Bars */}
                    <div className="relative flex items-end space-x-3 h-60">
                      {lagAnalysis.map((item, index) => (
                        <div
                          key={index} 
                          className="group cursor-pointer"
                          style={{ minWidth: '60px' }}
                        >
                          <div 
                            className="bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md hover:from-blue-700 hover:to-blue-500 transition-all duration-300 transform hover:scale-105"
                            style={{ 
                              height: `${Math.max(item.incois_warning_delay * 4, 20)}px`,
                              width: '50px'
                            }}
                          ></div>
                          <div className="text-xs text-center mt-2 text-gray-600">
                            {item.date.split('-').slice(1).join('/')}
                          </div>
                          
                          {/* Hover Tooltip */}
                          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                            <div className="font-medium">{item.hazard_type}</div>
                            <div>Delay: {item.incois_warning_delay}m</div>
                            <div>Reports: {item.report_count}</div>
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Chart Labels */}
                    <div className="absolute bottom-4 left-4 text-sm text-gray-600">
                      <div className="flex items-center mb-2">
                        <div className="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
                        Response Time (minutes)
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Analysis Table */}
              <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <Database className="w-5 h-5 mr-2" />
                    Detailed Response Analysis
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hazard Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">First Report</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warning Issued</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Response Delay</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report Count</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {lagAnalysis.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.date}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              {item.hazard_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.first_report_time}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.warning_issued_time}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              item.incois_warning_delay > 30 
                                ? 'bg-red-100 text-red-800' 
                                : item.incois_warning_delay > 20 
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {item.incois_warning_delay}m
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.report_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Social Media Intelligence Tab */}
          {activeTab === 'nlp-dashboard' && (
            <div className="space-y-6">
              {/* Real-time Social Media Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total Mentions</p>
                      <p className="text-3xl font-bold text-blue-600">24,567</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <Hash className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600">+15% from yesterday</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Sentiment Score</p>
                      <p className="text-3xl font-bold text-orange-600">6.2</p>
                    </div>
                    <div className="p-3 bg-orange-100 rounded-full">
                      <MessageSquare className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                    <span className="text-sm text-red-600">Slightly negative</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Active Sources</p>
                      <p className="text-3xl font-bold text-green-600">18</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <Globe className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600">3 new platforms</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Alert Rate</p>
                      <p className="text-3xl font-bold text-red-600">2.4%</p>
                    </div>
                    <div className="p-3 bg-red-100 rounded-full">
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <ArrowDownRight className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600">0.3% decrease</span>
                  </div>
                </div>
              </div>

              {/* Interactive Keyword Cloud */}
              <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                      <Hash className="w-5 h-5 mr-2" />
                      Trending Keywords Cloud
                    </h2>
                    <div className="flex space-x-2">
                      <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors">
                        Today
                      </button>
                      <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                        This Week
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="h-64 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg flex items-center justify-center">
                    <div className="flex flex-wrap justify-center items-center gap-4 w-full max-w-4xl">
                      {nlpTrends.map((trend, index) => (
                        <div
                          key={index}
                          className="group cursor-pointer transform hover:scale-110 transition-all duration-300"
                          style={{
                            fontSize: `${Math.min(Math.max(trend.frequency / 1000 + 0.8, 0.8), 2)}rem`
                          }}
                        >
                          <div 
                            className={`font-bold text-center p-3 rounded-lg hover:shadow-lg transition-all duration-300 ${
                              trend.sentiment_score >= 7 
                                ? 'text-red-600 hover:bg-red-100' 
                                : trend.sentiment_score >= 5 
                                ? 'text-orange-600 hover:bg-orange-100'
                                : 'text-blue-600 hover:bg-blue-100'
                            }`}
                          >
                            #{trend.keyword}
                            <div className="text-xs text-gray-500 mt-1">
                              {trend.frequency} mentions
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Platform Analytics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Social Media Platforms */}
                <div className="bg-white rounded-xl shadow-sm border">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Globe className="w-5 h-5 mr-2" />
                      Platform Analytics
                    </h3>
                  </div>
                  <div className="p-6 space-y-4">
                    {socialMediaData.map((platform, index) => (
                      <div key={index} className="group cursor-pointer bg-gray-50 hover:bg-gray-100 rounded-lg p-4 transition-all duration-300">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full mr-3 ${
                              platform.platform === 'Twitter' ? 'bg-blue-400' :
                              platform.platform === 'YouTube' ? 'bg-red-500' :
                              'bg-gray-400'
                            }`}></div>
                            <div>
                              <h4 className="font-medium text-gray-900">{platform.platform}</h4>
                              <p className="text-sm text-gray-500">{platform.mentions.toLocaleString()} mentions</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                platform.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                                platform.sentiment === 'neutral' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {platform.sentiment}
                              </span>
                              <MoreVertical className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <p className="text-xs text-red-600 mt-1">{platform.misinformation_posts} alerts</p>
                          </div>
                        </div>
                        
                        {/* Mini Progress Bar */}
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Activity</span>
                            <span>{Math.floor(platform.mentions / 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-500 ${
                                platform.platform === 'Twitter' ? 'bg-blue-400' :
                                platform.platform === 'YouTube' ? 'bg-red-500' :
                                'bg-gray-400'
                              }`}
                              style={{ width: `${Math.min(platform.mentions / 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sentiment Analysis */}
                <div className="bg-white rounded-xl shadow-sm border">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Brain className="w-5 h-5 mr-2" />
                      Real-time Sentiment Analysis
                    </h3>
                  </div>
                  <div className="p-6">
                    {/* Sentiment Gauge */}
                    <div className="mb-6">
                      <div className="relative h-32 bg-gradient-to-r from-red-100 via-yellow-100 to-green-100 rounded-full overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-3xl font-bold text-gray-800">6.2</div>
                            <div className="text-sm text-gray-600">Current Sentiment</div>
                          </div>
                        </div>
                        <div 
                          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-16 bg-gray-800 rounded-full origin-bottom transition-transform duration-1000"
                          style={{ transform: 'translate(-50%, -50%) rotate(-15deg)' }}
                        ></div>
                      </div>
                    </div>

                    {/* Sentiment Breakdown */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                          <span className="text-sm text-gray-700">Positive</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900 mr-2">23%</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div className="w-1/4 h-2 bg-green-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                          <span className="text-sm text-gray-700">Neutral</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900 mr-2">45%</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div className="w-1/2 h-2 bg-yellow-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                          <span className="text-sm text-gray-700">Negative</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900 mr-2">32%</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div className="w-1/3 h-2 bg-red-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}



          {/* Data Export & API Tab */}
          {activeTab === 'export-api' && (
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Download className="w-5 h-5 mr-2" />
                  Raw Data Export & API Access
                </h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-medium">Export Options</h3>
                    <div className="space-y-2">
                      <button onClick={() => handleExportData('csv')} className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center">
                        <Download className="w-4 h-4 mr-2" />
                        Export as CSV
                      </button>
                      <button onClick={() => handleExportData('json')} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center">
                        <Code className="w-4 h-4 mr-2" />
                        Export as JSON
                      </button>
                      <button className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center justify-center">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        API Documentation
                      </button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-medium">API Endpoints</h3>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm font-mono">
                      <p>GET /api/analyst/reports</p>
                      <p>GET /api/analyst/social-media</p>
                      <p>POST /api/analyst/query</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalystDashboard;
