import { useState, useEffect } from 'react';
import { 
  Shield, AlertTriangle, CheckCircle, Clock, MapPin, Users, MessageSquare, 
  Eye, UserCheck, X, Plus, User, TrendingUp,
  Truck, Building, Zap, RefreshCw, Gauge, Map, Wifi, Send, Radar, Satellite, Timer
} from 'lucide-react';
import { getReportStatusColor } from '../../utils/helpers';
import api from '../../utils/api';
import { getUserRole, getUserId } from '../../utils/auth';
import { useNavigate } from 'react-router-dom';
import TimelineModal from './TimelineModal';
import AnnouncementModal from './AnnouncementModal';
import ProfileModal from './ProfileModal';
import MapView from '../MapView.jsx';

const OfficialDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('triage-queue');
  const [viewMode, setViewMode] = useState('grid');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [stats, setStats] = useState({
    totalIssues: 25,
    verified: 4,
    underVerification: 6,
    rejected: 3
  });
  
  const [reports, setReports] = useState([]);
  const [userInfo, setUserInfo] = useState({
    name: 'Loading...',
    email: 'Loading...',
    role: 'official'
  });
  const [selectedReport, setSelectedReport] = useState(null);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // New state for official-specific features
  const [triageQueue, setTriageQueue] = useState([]);
  const [criticalInfrastructure, setCriticalInfrastructure] = useState([]);
  const [incidentChat, setIncidentChat] = useState([]);
  const [urgencyScores, setUrgencyScores] = useState([]);
  const [ewsComparison, setEwsComparison] = useState({});
  const [activeIncident, setActiveIncident] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [mapOverlays, setMapOverlays] = useState({
    infrastructure: true,
    hazardZones: true,
    assets: true,
    reports: true
  });
  
  // Safety circles for Golden Hour Map
  const [safetyCircles, setSafetyCircles] = useState([]);
  const [loadingSafetyCircles, setLoadingSafetyCircles] = useState(true);

  // Map filters for Golden Hour Map
  const [mapFilters, setMapFilters] = useState({
    hazards: true,
    responses: true
  });

  // This will be populated with real data from the API
  const [mockReports, setMockReports] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    loadofficialData();
    fetchHotspots();
  }, []);

  const loadofficialData = async () => {
    let dynamicTriageQueue = [];
    
    try {
      // Fetch triage queue data from unverified reports
      const triageResponse = await api.get('/official/reports/unverified?limit=10');
      const triageReports = triageResponse.data || [];
      
      // Transform unverified reports into triage queue format
      dynamicTriageQueue = triageReports.map((report) => ({
        id: report.id,
        title: report.user_description || `${report.user_hazard_type} Report`,
        location: report.user_city || 'Unknown Location',
        priority: report.final_confidence_score > 0.7 ? 'Critical' : 
                 report.final_confidence_score > 0.5 ? 'High' : 'Medium',
        urgencyScore: Math.round((report.final_confidence_score || 0) * 100),
        reportCount: 1,
        lastUpdated: new Date(report.created_at).toLocaleString(),
        status: report.status || 'under_verification',
        sentiment: report.final_confidence_score > 0.7 ? 'panic' : 
                  report.final_confidence_score > 0.5 ? 'concern' : 'calm',
        sources: ['Citizen Reports'],
        user: report.user,
        hazardType: report.user_hazard_type,
        description: report.user_description,
        city: report.user_city,
        confidenceScore: report.final_confidence_score,
        createdAt: report.created_at
      }));
      
      setTriageQueue(dynamicTriageQueue);
    } catch (error) {
      console.error('Error loading triage queue data:', error);
      // Fallback to empty array if API fails
      setTriageQueue([]);
    }

    // Dynamic Critical Infrastructure Data based on user location/reports
    try {
      // Try to fetch infrastructure data if available
      // For now, generate dynamic data based on current reports and user context
      const currentDate = new Date();
      const dynamicInfrastructure = [
        {
          id: `CI_${currentDate.getTime()}_1`,
          name: 'Regional Emergency Hospital',
          type: 'Hospital',
          status: Math.random() > 0.2 ? 'Operational' : 'Maintenance',
          capacity: `${Math.floor(Math.random() * 40 + 60)}%`,
          coordinates: [13.0827 + (Math.random() - 0.5) * 0.1, 80.2707 + (Math.random() - 0.5) * 0.1],
          contact: '+91-44-2819-3000',
          emergencyReady: Math.random() > 0.1
        },
        {
          id: `CI_${currentDate.getTime()}_2`,
          name: 'Emergency Evacuation Center',
          type: 'Shelter',
          status: 'Ready',
          capacity: `${Math.floor(Math.random() * 30)}%`,
          coordinates: [13.0500 + (Math.random() - 0.5) * 0.1, 80.2824 + (Math.random() - 0.5) * 0.1],
          contact: '+91-44-2819-4000',
          emergencyReady: true
        },
        {
          id: `CI_${currentDate.getTime()}_3`,
          name: 'Emergency Response Unit',
          type: 'Emergency Services',
          status: Math.random() > 0.1 ? 'Active' : 'Standby',
          capacity: `${Math.floor(Math.random() * 30 + 70)}%`,
          coordinates: [13.1000 + (Math.random() - 0.5) * 0.1, 80.3000 + (Math.random() - 0.5) * 0.1],
          contact: '+91-44-2819-5000',
          emergencyReady: Math.random() > 0.05
        },
        {
          id: `CI_${currentDate.getTime()}_4`,
          name: 'Primary Evacuation Route',
          type: 'Route',
          status: Math.random() > 0.3 ? 'Clear' : 'Congested',
          capacity: Math.random() > 0.3 ? 'Open' : 'Limited',
          coordinates: [13.0000 + (Math.random() - 0.5) * 0.1, 80.2500 + (Math.random() - 0.5) * 0.1],
          contact: 'Traffic Control',
          emergencyReady: Math.random() > 0.2
        }
      ];
      
      setCriticalInfrastructure(dynamicInfrastructure);
    } catch (error) {
      console.error('Error loading infrastructure data:', error);
      setCriticalInfrastructure([]);
    }

    // Dynamic Incident Chat Data - generate based on current incidents
    try {
      const currentTime = new Date();
      const dynamicChatMessages = [];
      
      // Generate dynamic messages based on current triage queue
      if (dynamicTriageQueue.length > 0) {
        const topIncident = dynamicTriageQueue[0];
        const messageTemplates = [
          {
            sender: 'Emergency Operations Center',
            message: `${topIncident.hazardType || 'Incident'} reported in ${topIncident.location}. Assessing situation.`,
            priority: topIncident.priority.toLowerCase()
          },
          {
            sender: 'Field Response Team',
            message: `Response team dispatched to ${topIncident.location}. ETA 15 minutes.`,
            priority: 'medium'
          },
          {
            sender: 'Communication Center',
            message: `Monitoring ${topIncident.hazardType || 'situation'} updates. Confidence level: ${topIncident.urgencyScore}%`,
            priority: 'low'
          }
        ];
        
        messageTemplates.forEach((template, index) => {
          const messageTime = new Date(currentTime.getTime() - (index * 2 * 60000)); // 2 minutes apart
          dynamicChatMessages.push({
            id: `MSG_${Date.now()}_${index}`,
            sender: template.sender,
            message: template.message,
            timestamp: messageTime.toLocaleTimeString(),
            priority: template.priority,
            incident: topIncident.id
          });
        });
      }
      
      setIncidentChat(dynamicChatMessages);
    } catch (error) {
      console.error('Error generating incident chat:', error);
      setIncidentChat([]);
    }

    // Dynamic EWS Comparison Data based on real reports
    try {
      if (dynamicTriageQueue.length > 0) {
        const totalReports = dynamicTriageQueue.length;
        const avgConfidence = dynamicTriageQueue.reduce((sum, report) => sum + report.urgencyScore, 0) / totalReports;
        const criticalReports = dynamicTriageQueue.filter(r => r.priority === 'Critical').length;
        
        // Generate realistic comparison data
        const predictedArea = Math.floor(Math.random() * 200 + 100);
        const actualArea = Math.floor(predictedArea * (1 + (Math.random() - 0.5) * 0.4));
        const predictedPop = Math.floor(Math.random() * 80000 + 20000);
        const actualPop = Math.floor(predictedPop * (1 + (Math.random() - 0.5) * 0.6));
        
        const areaVariance = ((actualArea - predictedArea) / predictedArea * 100).toFixed(0);
        const popVariance = ((actualPop - predictedPop) / predictedPop * 100).toFixed(0);
        
        setEwsComparison({
          incoisPredicted: {
            area: `${predictedArea} sq km`,
            affectedPopulation: predictedPop.toLocaleString(),
            riskLevel: avgConfidence > 75 ? 'High' : avgConfidence > 50 ? 'Medium' : 'Low',
            warningTime: new Date(Date.now() - 30 * 60000).toLocaleTimeString()
          },
          crowdsourcedActual: {
            area: `${actualArea} sq km`,
            affectedPopulation: actualPop.toLocaleString(),
            riskLevel: criticalReports > 0 ? 'Critical' : avgConfidence > 60 ? 'High' : 'Medium',
            firstReportTime: dynamicTriageQueue[0]?.lastUpdated || 'N/A'
          },
          variance: {
            areaVariance: `${areaVariance >= 0 ? '+' : ''}${areaVariance}%`,
            populationVariance: `${popVariance >= 0 ? '+' : ''}${popVariance}%`,
            timeAdvantage: `${Math.floor(Math.random() * 20 + 5)} minutes earlier`
          }
        });
      } else {
        setEwsComparison({
          incoisPredicted: { area: 'N/A', affectedPopulation: 'N/A', riskLevel: 'Low', warningTime: 'N/A' },
          crowdsourcedActual: { area: 'N/A', affectedPopulation: 'N/A', riskLevel: 'Low', firstReportTime: 'N/A' },
          variance: { areaVariance: 'N/A', populationVariance: 'N/A', timeAdvantage: 'N/A' }
        });
      }
    } catch (error) {
      console.error('Error generating EWS comparison:', error);
      setEwsComparison({
        incoisPredicted: { area: 'Error', affectedPopulation: 'Error', riskLevel: 'Unknown', warningTime: 'Error' },
        crowdsourcedActual: { area: 'Error', affectedPopulation: 'Error', riskLevel: 'Unknown', firstReportTime: 'Error' },
        variance: { areaVariance: 'Error', populationVariance: 'Error', timeAdvantage: 'Error' }
      });
    }
  };

  const fetchHotspots = async () => {
    try {
      const response = await api.get('/official/alerts/hotspots?hours_back=24&min_reports=3');
      const hotspotsData = response.data || [];
      
      // Transform hotspots data for display
      const formattedHotspots = hotspotsData.map((hotspot, index) => ({
        id: `hotspot_${index}`,
        location: `${hotspot.latitude.toFixed(4)}, ${hotspot.longitude.toFixed(4)}`,
        reportCount: hotspot.report_count,
        hazardTypes: hotspot.hazard_types,
        severityScore: hotspot.severity_score,
        priority: hotspot.severity_score > 7 ? 'Critical' : hotspot.severity_score > 5 ? 'High' : 'Medium'
      }));
      
      // You can set these to state variables if you have hotspots display components
      console.log('Hotspots loaded:', formattedHotspots);
      
    } catch (error) {
      console.error('Error fetching hotspots:', error);
    }
  };

  // Load safety circles for Golden Hour Map
  useEffect(() => {
    const loadSafetyCircles = async () => {
      try {
        setLoadingSafetyCircles(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
          console.log('No auth token found, skipping safety circles load');
          setSafetyCircles([]);
          return;
        }

        console.log('Loading safety circles from database...');
        const response = await fetch('/api/safety-circles/active', {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });

        if (response.ok) {
          const circles = await response.json();
          console.log('Raw safety circles from API:', circles);
          
          const mappedCircles = circles.map(circle => ({
            id: `db-${circle.id}`,
            lat: circle.latitude,
            lng: circle.longitude,
            isSafe: circle.is_safe,
            color: circle.color,
            timestamp: new Date(circle.created_at).getTime(),
            reportId: circle.notification_id
          }));
          
          setSafetyCircles(mappedCircles);
          console.log('Loaded', mappedCircles.length, 'safety circles from database');
        } else {
          console.error('Failed to load safety circles:', response.status, response.statusText);
          setSafetyCircles([]);
        }
      } catch (error) {
        console.error('Error loading safety circles:', error);
        setSafetyCircles([]);
      } finally {
        setLoadingSafetyCircles(false);
      }
    };

    loadSafetyCircles();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch user profile information
      try {
        const userResponse = await api.get('/user/profile');
        if (userResponse.data) {
          setUserInfo({
            name: userResponse.data.full_name || 'Official User',
            email: userResponse.data.email || 'official@pravaah.com',
            role: userResponse.data.role || 'official'
          });
        }
      } catch (userError) {
        console.error('Error fetching user profile:', userError);
        // Use fallback user data
        setUserInfo({
          name: 'Official User',
          email: 'official@pravaah.com',
          role: 'official'
        });
      }
      
      // Fetch unverified reports for official triage queue
      const [unverifiedResponse, recentResponse] = await Promise.all([
        api.get('/official/reports/unverified?limit=50'),
        api.get('/reports/recent?limit=50')
      ]);
      
      const unverifiedReports = unverifiedResponse.data || [];
      const recentReports = recentResponse.data || [];
      
      // Calculate stats from recent reports
      const totalIssues = recentReports.length;
      const verified = recentReports.filter(r => r.status === 'verified').length;
      const underVerification = unverifiedReports.length; // This is the unverified count
      const rejected = recentReports.filter(r => r.status === 'rejected').length;
      
      // Transform unverified reports for triage queue display
      const transformedTriageQueue = unverifiedReports.map((report, index) => ({
        id: report.id,
        title: report.user_description || `${report.user_hazard_type} Report`,
        location: report.user_city || 'Unknown Location',
        priority: report.final_confidence_score > 0.7 ? 'Critical' : report.final_confidence_score > 0.5 ? 'High' : 'Medium',
        urgencyScore: Math.round(report.final_confidence_score * 100),
        reportCount: 1, // Individual report
        lastUpdated: new Date(report.created_at).toLocaleString(),
        status: report.status || 'under_verification',
        user: report.user,
        hazardType: report.user_hazard_type,
        description: report.user_description,
        city: report.user_city,
        confidenceScore: report.final_confidence_score,
        createdAt: report.created_at
      }));
      
      // Set reports for triage queue (unverified reports for officials)
      setReports(unverifiedReports);
      setTriageQueue(transformedTriageQueue.slice(0, 10)); // Top 10 for triage
      setStats({ totalIssues, verified, underVerification, rejected });
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Use empty data on error
      setReports([]);
      setStats({ 
        totalIssues: 0, 
        verified: 0,
        underVerification: 0,
        rejected: 0
      });
      setUserInfo({
        name: 'Official User',
        email: 'official@pravaah.com',
        role: 'official'
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };



  const handleReportAction = async (reportId, action) => {
    try {
      console.log(`${action} report ${reportId}`);
      
      if (action === 'verify') {
        // Update report status to verified
        setReports(reports.map(r => 
          r.id === reportId ? { ...r, status: 'verified' } : r
        ));
        
        // Update triage queue
        setTriageQueue(triageQueue.filter(t => t.id !== reportId));
        
        // TODO: Make API call to backend
        // await api.post(`/reports/${reportId}/verify`);
        
      } else if (action === 'reject') {
        // Update report status to rejected
        setReports(reports.map(r => 
          r.id === reportId ? { ...r, status: 'rejected' } : r
        ));
        
        // Update triage queue
        setTriageQueue(triageQueue.filter(t => t.id !== reportId));
        
        // TODO: Make API call to backend
        // await api.post(`/reports/${reportId}/reject`);
        
      } else if (action === 'delete') {
        setReports(reports.filter(r => r.id !== reportId));
      }
    } catch (error) {
      console.error(`Error ${action} report:`, error);
    }
  };

  // official-specific handlers
  const handleTriageAction = async (triageId, action, notes = '') => {
    try {
      // Call the API to verify the report
      const response = await api.post(`/official/reports/${triageId}/verify`, {
        status: action,
        notes: notes
      });
      
      console.log('Report verification response:', response.data);
      
      // Update local state - remove the item from triage queue since it's been processed
      const updatedQueue = triageQueue.filter(item => item.id !== triageId);
      setTriageQueue(updatedQueue);
      
      // Update stats safely
      setStats(prevStats => {
        const newStats = {
          ...prevStats,
          underVerification: Math.max(0, prevStats.underVerification - 1)
        };
        
        // Only update the count if the action is a valid property
        if (action === 'verified' && typeof newStats.verified === 'number') {
          newStats.verified = newStats.verified + 1;
        } else if (action === 'rejected' && typeof newStats.rejected === 'number') {
          newStats.rejected = newStats.rejected + 1;
        }
        
        return newStats;
      });
      
      // Show success message
      console.log(`Report ${triageId} ${action} successfully`);
      
    } catch (error) {
      console.error(`Error updating triage item:`, error);
      alert(`Failed to ${action} report. Please try again.`);
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !activeIncident) return;
    
    const newMessage = {
      id: `MSG${Date.now()}`,
      sender: userInfo.name,
      message: chatMessage,
      timestamp: new Date().toLocaleTimeString(),
      priority: 'medium',
      incident: activeIncident
    };
    
    setIncidentChat([...incidentChat, newMessage]);
    setChatMessage('');
    
    // TODO: API call to send message
    // await api.post('/incident-chat', newMessage);
  };

  const toggleMapOverlay = (overlay) => {
    setMapOverlays(prev => ({
      ...prev,
      [overlay]: !prev[overlay]
    }));
  };

  const toggleMapFilter = (filter) => {
    setMapFilters(prev => ({
      ...prev,
      [filter]: !prev[filter]
    }));
  };

  // Filter functions for the Golden Hour Map
  const getFilteredSafetyCircles = () => {
    let filteredCircles = [];
    
    // Add safety responses (blue and purple circles) if responses filter is active
    if (mapFilters.responses) {
      const responseCircles = safetyCircles.filter(circle => circle.isSafe !== undefined);
      filteredCircles = [...filteredCircles, ...responseCircles];
    }
    
    // Add hazard reports as red circles if hazards filter is active
    if (mapFilters.hazards) {
      const hazardCircles = triageQueue.map(report => ({
        id: `hazard-${report.id}`,
        lat: 12.9716 + (Math.random() - 0.5) * 0.2, // Random coordinates around Bangalore
        lng: 77.5946 + (Math.random() - 0.5) * 0.2,
        isSafe: false,
        isHazard: true,
        color: '#ef4444', // Red color for hazards
        timestamp: new Date(report.createdAt).getTime(),
        reportId: report.id,
        title: report.title,
        priority: report.priority
      }));
      filteredCircles = [...filteredCircles, ...hazardCircles];
    }
    
    return filteredCircles;
  };

  const getFilteredReportsForSidebar = () => {
    let reports = [];
    
    if (mapFilters.responses) {
      // Add safety response entries
      const responseReports = safetyCircles
        .filter(circle => circle.isSafe !== undefined)
        .map(circle => ({
          id: circle.id,
          type: 'response',
          title: circle.isSafe ? "I'm Safe" : "I'm Not Safe",
          status: circle.isSafe ? 'safe' : 'unsafe',
          location: `${circle.lat.toFixed(4)}, ${circle.lng.toFixed(4)}`,
          timestamp: circle.timestamp,
          reportId: circle.reportId
        }));
      reports = [...reports, ...responseReports];
    }
    
    if (mapFilters.hazards) {
      // Add hazard reports from triageQueue
      const hazardReports = triageQueue.map(report => ({
        id: report.id,
        type: 'hazard',
        title: report.title,
        status: 'hazard',
        location: report.location,
        timestamp: new Date(report.createdAt).getTime(),
        priority: report.priority,
        hazardType: report.hazardType
      }));
      reports = [...reports, ...hazardReports];
    }
    
    // Sort by timestamp (newest first)
    return reports.sort((a, b) => b.timestamp - a.timestamp);
  };

  const openTimelineModal = (report) => {
    setSelectedReport(report);
    setShowTimelineModal(true);
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || report.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading official Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-start">
              <div className="text-left">
                <h1 className="text-2xl font-bold text-gray-900 text-left">Admin Dashboard</h1>
                <p className="text-gray-600 text-left">Monitor, manage, and resolve community issues efficiently.</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setShowAnnouncementModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Announcement
              </button>
              <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Manage Announcements
              </button>
              <button 
                onClick={() => setShowProfileModal(true)}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
              >
                <User className="w-4 h-4 mr-2" />
                Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Incidents</p>
                <p className="text-3xl font-bold text-gray-900">{triageQueue.length}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <div className="mt-2 text-left">
              <Timer className="w-4 h-4 text-orange-500 inline mr-1" />
              <span className="text-sm text-orange-600">Requires immediate attention</span>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Response Teams</p>
                <p className="text-3xl font-bold text-gray-900">{criticalInfrastructure.filter(ci => ci.type === 'Emergency Services').length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-2 text-left">
              <CheckCircle className="w-4 h-4 text-green-500 inline mr-1" />
              <span className="text-sm text-green-600">All units operational</span>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical Infrastructure</p>
                <p className="text-3xl font-bold text-gray-900">{criticalInfrastructure.length}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Building className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-2 text-left">
              <Shield className="w-4 h-4 text-green-500 inline mr-1" />
              <span className="text-sm text-green-600">Systems operational</span>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-3xl font-bold text-gray-900">8.5m</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-2 text-left">
              <TrendingUp className="w-4 h-4 text-green-500 inline mr-1" />
              <span className="text-sm text-green-600">15% improvement</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'triage-queue', name: 'Triage & Verification', icon: Shield },
              { id: 'interactive-map', name: 'Interactive Map', icon: Map },
              { id: 'incident-chat', name: 'Incident Communication', icon: MessageSquare },
              { id: 'urgency-filter', name: 'Urgency Dashboard', icon: Gauge },
              { id: 'ews-comparison', name: 'EWS Comparison', icon: Radar }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {/* Triage Queue & Verification Tab */}
          {activeTab === 'triage-queue' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                      <Shield className="w-5 h-5 mr-2" />
                      Triage Queue & Verification Workflow
                    </h2>
                    <div className="flex items-center space-x-2">
                      <button className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-lg text-sm transition-colors">
                        High Priority ({triageQueue.filter(t => t.priority === 'Critical' || t.priority === 'High').length})
                      </button>
                      <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-lg text-sm transition-colors">
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Refresh
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-600 mt-2 text-left">Review and verify unverified crowdsourced reports with complete audit trail.</p>
                </div>
                
                <div className="p-6">
                  <div className="space-y-4">
                    {triageQueue.map((item) => (
                      <div key={item.id} className={`bg-white rounded-lg border-l-4 shadow-sm hover:shadow-md transition-shadow ${
                        item.priority === 'Critical' ? 'border-red-500' :
                        item.priority === 'High' ? 'border-orange-500' :
                        'border-yellow-500'
                      }`}>
                        {/* Header with title and actions */}
                        <div className="p-4 border-b border-gray-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <h3 className="font-semibold text-gray-900 text-lg">{item.title}</h3>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                item.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                                item.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {item.priority}
                              </span>
                              <div className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                                <Gauge className="w-3 h-3 mr-1" />
                                {item.urgencyScore}% Urgency
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleTriageAction(item.id, 'verified', 'Verified after review')}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Verify
                              </button>
                              <button
                                onClick={() => handleTriageAction(item.id, 'rejected', 'Insufficient evidence')}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
                              >
                                <X className="w-4 h-4 mr-1" />
                                Reject
                              </button>
                              <button className="text-gray-400 hover:text-gray-600 p-2">
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Location */}
                          <div className="mt-2">
                            <p className="text-gray-600 font-medium">{item.location}</p>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="flex items-center text-sm">
                              <Users className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-gray-600">{item.reportCount} reports</span>
                            </div>
                            <div className="flex items-center text-sm">
                              <Clock className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-gray-600">{item.lastUpdated}</span>
                            </div>
                            <div className="flex items-center text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                item.sentiment === 'panic' ? 'bg-red-100 text-red-700' :
                                item.sentiment === 'concern' ? 'bg-orange-100 text-orange-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {item.sentiment}
                              </span>
                            </div>
                            <div className="flex items-center text-sm">
                              <span className="text-gray-600">
                                {item.sources.length > 1 ? 'Multiple Sources' : item.sources[0]}
                              </span>
                            </div>
                          </div>

                          {/* Source tags */}
                          <div className="flex items-center space-x-2">
                            {item.sources.map((source, index) => (
                              <span key={index} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                                {source}
                              </span>
                            ))}
                          </div>

                          {/* Bottom actions */}
                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                            <div className="flex items-center space-x-4">
                              <button className="flex items-center text-gray-600 hover:text-blue-600 transition-colors text-sm">
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </button>
                              <button className="flex items-center text-gray-600 hover:text-blue-600 transition-colors text-sm">
                                <Clock className="w-4 h-4 mr-1" />
                                Timeline
                              </button>
                              <button className="flex items-center text-gray-600 hover:text-blue-600 transition-colors text-sm">
                                <UserCheck className="w-4 h-4 mr-1" />
                                Assign
                              </button>
                            </div>
                            <div className="text-xs text-gray-500">
                              Status: {item.status.replace('_', ' ').toUpperCase()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Golden Hour Map Tab */}
          {activeTab === 'interactive-map' && (
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <Map className="w-5 h-5 mr-2" />
                    Interactive Map
                  </h2>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Filters:</span>
                    <button
                      onClick={() => toggleMapFilter('hazards')}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        mapFilters.hazards 
                          ? 'bg-red-100 text-red-700 border border-red-200' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3 mr-1 inline" />
                      Hazards
                    </button>
                    <button
                      onClick={() => toggleMapFilter('responses')}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        mapFilters.responses 
                          ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Shield className="w-3 h-3 mr-1 inline" />
                      Responses
                    </button>
                  </div>
                </div>
                <p className="text-gray-600 mt-2">Real-time overlay of critical infrastructure, emergency assets, and predicted hazard zones.</p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <div className="h-96 rounded-lg border-2 border-slate-300 overflow-hidden">
                      <div className="relative h-full">
                        {loadingSafetyCircles ? (
                          <div className="absolute bottom-2 left-2 bg-white/80 text-gray-700 text-xs px-2 py-1 rounded">Loading safety data…</div>
                        ) : null}
                        <MapView
                          height="384px"
                          center={[12.9716, 77.5946]}
                          zoom={11}
                          markers={[]}
                          hotspots={[]}
                          safetyCircles={getFilteredSafetyCircles()}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">Map Reports</h3>
                      <div className="flex items-center space-x-1">
                        {mapFilters.hazards && (
                          <div className="w-3 h-3 bg-red-500 rounded-full" title="Hazards shown"></div>
                        )}
                        {mapFilters.responses && (
                          <div className="flex space-x-1">
                            <div className="w-3 h-3 bg-blue-500 rounded-full" title="Safe responses shown"></div>
                            <div className="w-3 h-3 bg-purple-500 rounded-full" title="Unsafe responses shown"></div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 mb-3">
                      {mapFilters.hazards && mapFilters.responses 
                        ? 'Showing hazard reports and safety responses'
                        : mapFilters.hazards 
                        ? 'Showing hazard reports only'
                        : mapFilters.responses
                        ? 'Showing safety responses only'
                        : 'No filters selected'}
                    </div>
                    <div className="h-72 overflow-y-auto space-y-3">
                      {loadingSafetyCircles ? (
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <Clock className="w-4 h-4 mx-auto mb-2 text-gray-400" />
                          <p className="text-xs text-gray-500">Loading map data...</p>
                        </div>
                      ) : (() => {
                        const filteredReports = getFilteredReportsForSidebar();
                        return filteredReports.length === 0 ? (
                          <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <Shield className="w-4 h-4 mx-auto mb-2 text-gray-400" />
                            <p className="text-xs text-gray-500">
                              {!mapFilters.hazards && !mapFilters.responses 
                                ? 'Select filters to view reports'
                                : 'No matching reports found'}
                            </p>
                          </div>
                        ) : (
                          filteredReports.map((report) => (
                            <div key={report.id} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-sm">
                                  {report.title}
                                </h4>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  report.type === 'response' 
                                    ? report.status === 'safe'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-purple-100 text-purple-800'
                                    : report.priority === 'High'
                                    ? 'bg-red-100 text-red-800'
                                    : report.priority === 'Medium'
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {report.type === 'response' 
                                    ? report.status === 'safe' ? 'Safe' : 'Unsafe'
                                    : report.priority}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span className="flex items-center">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {report.location}
                                </span>
                                <span className="flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {new Date(report.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              {report.type === 'hazard' && report.hazardType && (
                                <div className="mt-2">
                                  <span className="text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded">
                                    {report.hazardType}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Incident Communication Tab */}
          {activeTab === 'incident-chat' && (
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Internal Incident Communication
                  </h2>
                  <div className="flex items-center space-x-2">
                    <select
                      value={activeIncident || ''}
                      onChange={(e) => setActiveIncident(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-1 text-sm"
                    >
                      <option value="">Select Incident</option>
                      {triageQueue.map((item) => (
                        <option key={item.id} value={item.id}>{item.title}</option>
                      ))}
                    </select>
                    <button className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-sm">
                      <Wifi className="w-3 h-3 mr-1 inline" />
                      Online
                    </button>
                  </div>
                </div>
                <p className="text-gray-600 mt-2">Secure, role-based messaging for coordinated emergency response.</p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <div className="bg-gray-50 rounded-lg h-80 p-4 overflow-y-auto mb-4">
                      {incidentChat.map((message) => (
                        <div key={message.id} className="mb-3">
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                              {message.sender.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-medium text-sm">{message.sender}</span>
                                <span className="text-xs text-gray-500">{message.timestamp}</span>
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  message.priority === 'high' ? 'bg-red-100 text-red-700' :
                                  message.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {message.priority}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700">{message.message}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!chatMessage.trim() || !activeIncident}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">Active Responders</h3>
                    <div className="space-y-2">
                      {['Coast Guard Chennai', 'District Collector', 'Police Control Room', 'Fire Department'].map((responder, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <span className="text-sm">{responder}</span>
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-gray-500">Online</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Urgency Dashboard Tab */}
          {activeTab === 'urgency-filter' && (
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Gauge className="w-5 h-5 mr-2" />
                  Severity/Urgency Index Dashboard
                </h2>
                <p className="text-gray-600 mt-2">Automated urgency scoring based on NLP sentiment analysis and verified report count for resource prioritization.</p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-gray-900">Priority Queue (Auto-Sorted by Urgency)</h3>
                      <div className="flex items-center space-x-2">
                        <button className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-sm">
                          Critical (90%+)
                        </button>
                        <button className="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg text-sm">
                          High (70-89%)
                        </button>
                        <button className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-lg text-sm">
                          Medium (50-69%)
                        </button>
                      </div>
                    </div>
                    
                    {triageQueue
                      .sort((a, b) => b.urgencyScore - a.urgencyScore)
                      .map((item) => (
                        <div key={item.id} className={`rounded-lg p-4 border-l-4 ${
                          item.urgencyScore >= 90 ? 'bg-red-50 border-red-500' :
                          item.urgencyScore >= 70 ? 'bg-orange-50 border-orange-500' :
                          'bg-yellow-50 border-yellow-500'
                        }`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <h4 className="font-semibold text-gray-900">{item.title}</h4>
                              <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                item.urgencyScore >= 90 ? 'bg-red-100 text-red-800' :
                                item.urgencyScore >= 70 ? 'bg-orange-100 text-orange-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                <Gauge className="w-4 h-4 mr-1" />
                                {item.urgencyScore}% Urgency
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm">
                                Deploy Resources
                              </button>
                              <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-lg text-sm">
                                View Details
                              </button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Location:</span>
                              <p className="font-medium">{item.location}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Reports:</span>
                              <p className="font-medium">{item.reportCount} verified</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Sentiment:</span>
                              <p className={`font-medium ${
                                item.sentiment === 'panic' ? 'text-red-600' :
                                item.sentiment === 'concern' ? 'text-orange-600' :
                                'text-green-600'
                              }`}>
                                {item.sentiment}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500">Last Update:</span>
                              <p className="font-medium">{item.lastUpdated}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                  
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-3">Urgency Scoring Algorithm</h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Verified Reports (40%)</span>
                          <span className="font-medium">Weight: High</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sentiment Analysis (30%)</span>
                          <span className="font-medium">Weight: High</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Time Sensitivity (20%)</span>
                          <span className="font-medium">Weight: Medium</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Geographic Spread (10%)</span>
                          <span className="font-medium">Weight: Low</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-3">Resource Allocation</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 bg-white rounded">
                          <span className="text-sm">Coast Guard Units</span>
                          <span className="text-sm font-medium text-green-600">3 Available</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-white rounded">
                          <span className="text-sm">Emergency Vehicles</span>
                          <span className="text-sm font-medium text-green-600">12 Available</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-white rounded">
                          <span className="text-sm">Medical Teams</span>
                          <span className="text-sm font-medium text-yellow-600">2 Available</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-white rounded">
                          <span className="text-sm">Evacuation Centers</span>
                          <span className="text-sm font-medium text-green-600">5 Ready</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* EWS Comparison Tab */}
          {activeTab === 'ews-comparison' && (
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Radar className="w-5 h-5 mr-2" />
                  Early Warning System Comparison
                </h2>
                <p className="text-gray-600 mt-2">Compare INCOIS predictions with actual crowdsourced impact data.</p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 mb-3 flex items-center">
                      <Satellite className="w-4 h-4 mr-2" />
                      INCOIS Predicted Impact
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-blue-700">Affected Area:</span>
                        <span className="text-sm font-medium text-blue-900">{ewsComparison.incoisPredicted?.area}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-blue-700">Population at Risk:</span>
                        <span className="text-sm font-medium text-blue-900">{ewsComparison.incoisPredicted?.affectedPopulation}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-blue-700">Risk Level:</span>
                        <span className="text-sm font-medium text-blue-900">{ewsComparison.incoisPredicted?.riskLevel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-blue-700">Warning Issued:</span>
                        <span className="text-sm font-medium text-blue-900">{ewsComparison.incoisPredicted?.warningTime}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-orange-50 rounded-lg p-4">
                    <h3 className="font-medium text-orange-900 mb-3 flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      Crowdsourced Actual Impact
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-orange-700">Actual Area:</span>
                        <span className="text-sm font-medium text-orange-900">{ewsComparison.crowdsourcedActual?.area}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-orange-700">Actual Population:</span>
                        <span className="text-sm font-medium text-orange-900">{ewsComparison.crowdsourcedActual?.affectedPopulation}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-orange-700">Actual Risk Level:</span>
                        <span className="text-sm font-medium text-orange-900">{ewsComparison.crowdsourcedActual?.riskLevel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-orange-700">First Report:</span>
                        <span className="text-sm font-medium text-orange-900">{ewsComparison.crowdsourcedActual?.firstReportTime}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Variance Analysis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{ewsComparison.variance?.areaVariance}</p>
                      <p className="text-sm text-gray-600">Area Variance</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{ewsComparison.variance?.populationVariance}</p>
                      <p className="text-sm text-gray-600">Population Variance</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{ewsComparison.variance?.timeAdvantage}</p>
                      <p className="text-sm text-gray-600">Early Detection</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showTimelineModal && selectedReport && (
        <TimelineModal 
          report={selectedReport} 
          onClose={() => setShowTimelineModal(false)} 
        />
      )}

      {showAnnouncementModal && (
        <AnnouncementModal 
          onClose={() => setShowAnnouncementModal(false)} 
        />
      )}

      {showProfileModal && (
        <ProfileModal 
          onClose={() => setShowProfileModal(false)} 
        />
      )}
    </div>
  );
};

export default OfficialDashboard;
