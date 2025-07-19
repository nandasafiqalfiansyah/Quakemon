import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, MapPin, Clock, Activity, Layers, Globe, Camera, RefreshCw, Wifi, WifiOff, Users, List, TrendingUp, Heart, Moon, Sun, Bell, BellOff, Zap } from 'lucide-react';

interface EarthquakeData {
  Tanggal: string;
  Jam: string;
  DateTime: string;
  coordinates: string;
  Lintang: string;
  Bujur: string;
  Magnitude: string;
  Kedalaman: string;
  Wilayah: string;
  Potensi: string;
  Dirasakan: string;
  Shakemap: string;
}

interface RecentEarthquake {
  Tanggal: string;
  Jam: string;
  DateTime: string;
  Coordinates: string;
  Lintang: string;
  Bujur: string;
  Magnitude: string;
  Kedalaman: string;
  Wilayah: string;
  Potensi: string;
  Dirasakan?: string;
}

interface RecentEarthquakeData {
  Infogempa: {
    gempa: RecentEarthquake[];
  };
}

function App() {
  const [latestEarthquake, setLatestEarthquake] = useState<EarthquakeData | null>(null);
  const [recentEarthquakes, setRecentEarthquakes] = useState<RecentEarthquake[]>([]);
  const [feltEarthquakes, setFeltEarthquakes] = useState<RecentEarthquake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeTab, setActiveTab] = useState<'latest' | 'recent' | 'felt'>('latest');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [hasNewData, setHasNewData] = useState(false);
  const [lastDataHash, setLastDataHash] = useState<string>('');

  // Apply dark mode to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const generateDataHash = (latest: EarthquakeData | null, recent: RecentEarthquake[], felt: RecentEarthquake[]) => {
    const data = {
      latest: latest?.DateTime || '',
      recent: recent.map(e => e.DateTime).join(','),
      felt: felt.map(e => e.DateTime).join(',')
    };
    return btoa(JSON.stringify(data));
  };

  const parseXMLData = (xmlText: string): EarthquakeData | null => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      const gempaElement = xmlDoc.querySelector('gempa');
      if (!gempaElement) {
        throw new Error('No gempa element found in XML');
      }

      const getData = (tagName: string): string => {
        const element = gempaElement.querySelector(tagName);
        return element?.textContent?.trim() || '';
      };

      return {
        Tanggal: getData('Tanggal'),
        Jam: getData('Jam'),
        DateTime: getData('DateTime'),
        coordinates: getData('coordinates'),
        Lintang: getData('Lintang'),
        Bujur: getData('Bujur'),
        Magnitude: getData('Magnitude'),
        Kedalaman: getData('Kedalaman'),
        Wilayah: getData('Wilayah'),
        Potensi: getData('Potensi'),
        Dirasakan: getData('Dirasakan'),
        Shakemap: getData('Shakemap')
      };
    } catch (err) {
      console.error('Error parsing XML:', err);
      return null;
    }
  };

  const fetchAllEarthquakeData = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      
      // Fetch latest earthquake (XML)
      const latestResponse = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.xml', {
        method: 'GET',
        headers: { 'Accept': 'application/xml, text/xml' },
        cache: 'no-cache'
      });
      
      if (!latestResponse.ok) {
        throw new Error(`HTTP error! status: ${latestResponse.status}`);
      }
      
      const xmlText = await latestResponse.text();
      const parsedLatest = parseXMLData(xmlText);
      
      let newRecent: RecentEarthquake[] = [];
      let newFelt: RecentEarthquake[] = [];

      // Fetch recent M≥5.0 earthquakes (JSON)
      try {
        const recentResponse = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json', {
          cache: 'no-cache'
        });
        if (recentResponse.ok) {
          const recentData: RecentEarthquakeData = await recentResponse.json();
          newRecent = recentData.Infogempa?.gempa?.slice(0, 15) || [];
        }
      } catch (err) {
        console.warn('Failed to fetch recent earthquakes:', err);
      }

      // Fetch felt earthquakes (JSON)
      try {
        const feltResponse = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json', {
          cache: 'no-cache'
        });
        if (feltResponse.ok) {
          const feltData: RecentEarthquakeData = await feltResponse.json();
          newFelt = feltData.Infogempa?.gempa?.slice(0, 15) || [];
        }
      } catch (err) {
        console.warn('Failed to fetch felt earthquakes:', err);
      }

      // Check for data changes
      const newHash = generateDataHash(parsedLatest, newRecent, newFelt);
      if (lastDataHash && newHash !== lastDataHash && silent) {
        setHasNewData(true);
        // Show notification for significant earthquakes
        if (parsedLatest && parseFloat(parsedLatest.Magnitude) >= 6.0) {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🚨 Gempa Kuat Terdeteksi!', {
              body: `M${parsedLatest.Magnitude} - ${parsedLatest.Wilayah}`,
              icon: '/favicon.ico'
            });
          }
        }
      }

      if (parsedLatest) {
        setLatestEarthquake(parsedLatest);
      }
      setRecentEarthquakes(newRecent);
      setFeltEarthquakes(newFelt);
      setLastDataHash(newHash);
      setLastUpdated(new Date());
      
      if (hasNewData && !silent) {
        setHasNewData(false);
      }
    } catch (err) {
      console.error('Error fetching earthquake data:', err);
      if (!silent) {
        setError('Gagal mengambil data gempa. Silakan coba lagi.');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [lastDataHash, hasNewData]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    fetchAllEarthquakeData();
    
    let interval: NodeJS.Timeout;
    if (autoUpdate) {
      // Check for updates every 30 seconds silently
      interval = setInterval(() => {
        fetchAllEarthquakeData(true);
      }, 30000);
    }
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [autoUpdate, fetchAllEarthquakeData]);

  const getMagnitudeInfo = (magnitude: string) => {
    const mag = parseFloat(magnitude);
    if (mag < 5.0) {
      return {
        classification: 'Gempa Ringan',
        color: darkMode ? 'text-green-400' : 'text-green-600',
        bgColor: darkMode ? 'bg-green-900/20' : 'bg-green-50',
        borderColor: darkMode ? 'border-green-700' : 'border-green-200',
        icon: '🟢'
      };
    } else if (mag < 6.0) {
      return {
        classification: 'Gempa Sedang',
        color: darkMode ? 'text-yellow-400' : 'text-yellow-600',
        bgColor: darkMode ? 'bg-yellow-900/20' : 'bg-yellow-50',
        borderColor: darkMode ? 'border-yellow-700' : 'border-yellow-200',
        icon: '🟡'
      };
    } else {
      return {
        classification: 'Gempa Kuat',
        color: darkMode ? 'text-red-400' : 'text-red-600',
        bgColor: darkMode ? 'bg-red-900/20' : 'bg-red-50',
        borderColor: darkMode ? 'border-red-700' : 'border-red-200',
        icon: '🔴'
      };
    }
  };

  const formatDateTime = (date: string, time: string, utcDateTime: string) => {
    try {
      const wibTime = `${date}, ${time} WIB`;
      
      let utcTime = 'UTC tidak tersedia';
      if (utcDateTime) {
        try {
          const utcDate = new Date(utcDateTime);
          utcTime = utcDate.toLocaleString('en-US', {
            timeZone: 'UTC',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) + ' UTC';
        } catch {
          utcTime = utcDateTime;
        }
      }
      
      return { wib: wibTime, utc: utcTime };
    } catch {
      return { wib: `${date}, ${time} WIB`, utc: 'UTC tidak tersedia' };
    }
  };

  const getShakemapUrl = (shakemap: string) => {
    if (!shakemap) return null;
    return `https://data.bmkg.go.id/DataMKG/TEWS/${shakemap}`;
  };

  const parseCoordinates = (coordinates: string) => {
    if (!coordinates) return { lat: '', lng: '' };
    const coords = coordinates.split(',');
    return {
      lat: coords[0]?.trim() || '',
      lng: coords[1]?.trim() || ''
    };
  };

  const renderEarthquakeCard = (earthquake: RecentEarthquake, index: number, showDirasakan: boolean = false) => {
    const magnitudeInfo = getMagnitudeInfo(earthquake.Magnitude);
    const dateTime = formatDateTime(earthquake.Tanggal, earthquake.Jam, earthquake.DateTime);
    const coordinates = parseCoordinates(earthquake.Coordinates);

    return (
      <div key={index} className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg border ${magnitudeInfo.borderColor} p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{magnitudeInfo.icon}</span>
            <div>
              <span className={`font-bold text-lg ${magnitudeInfo.color}`}>M {earthquake.Magnitude}</span>
              <span className={`text-sm ml-2 ${magnitudeInfo.color} opacity-75`}>({magnitudeInfo.classification})</span>
            </div>
          </div>
          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} bg-opacity-50 px-2 py-1 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            {dateTime.wib}
          </span>
        </div>
        
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <span className={`${darkMode ? 'text-gray-200' : 'text-gray-700'} font-medium`}>{earthquake.Wilayah}</span>
          </div>
          
          <div className={`flex items-center gap-6 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <span className="flex items-center gap-1">
              <Layers className="h-4 w-4" />
              {earthquake.Kedalaman}
            </span>
            <span className="flex items-center gap-1">
              <Globe className="h-4 w-4" />
              {coordinates.lat || earthquake.Lintang}, {coordinates.lng || earthquake.Bujur}
            </span>
          </div>
          
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
            <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-xs`}>{earthquake.Potensi}</span>
          </div>
          
          {showDirasakan && earthquake.Dirasakan && (
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
              <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-xs`}>{earthquake.Dirasakan}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading && !latestEarthquake) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gradient-to-br from-gray-900 to-gray-800' : 'bg-gradient-to-br from-blue-50 to-indigo-100'} flex items-center justify-center`}>
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 border`}>
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
              <Activity className="h-8 w-8 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
          </div>
          <p className={`text-center ${darkMode ? 'text-gray-200' : 'text-gray-600'} font-medium text-lg`}>Mengambil Quakemon load data gempa terbaru...</p>
          <p className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-400'} text-sm mt-2`}>Sumber: BMKG XML & JSON</p>
          <div className="mt-4 flex justify-center">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !latestEarthquake) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gradient-to-br from-red-900 to-gray-900' : 'bg-gradient-to-br from-red-50 to-pink-100'} flex items-center justify-center`}>
        <div className={`${darkMode ? 'bg-gray-800 border-red-700' : 'bg-white'} p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 border`}>
          <div className="flex items-center justify-center mb-6">
            <WifiOff className="h-16 w-16 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-red-600 text-center mb-4">Koneksi Bermasalah</h2>
          <p className={`text-center ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-6`}>{error}</p>
          <button
            onClick={() => fetchAllEarthquakeData()}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 px-6 rounded-xl font-medium hover:from-red-700 hover:to-red-800 transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
          >
            <RefreshCw className="h-5 w-5" />
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const magnitudeInfo = latestEarthquake ? getMagnitudeInfo(latestEarthquake.Magnitude) : null;
  const dateTime = latestEarthquake ? formatDateTime(latestEarthquake.Tanggal, latestEarthquake.Jam, latestEarthquake.DateTime) : null;
  const shakemapUrl = latestEarthquake ? getShakemapUrl(latestEarthquake.Shakemap) : null;
  const coordinates = latestEarthquake ? parseCoordinates(latestEarthquake.coordinates) : null;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-slate-50 to-blue-50'}`}>
      {/* Header */}
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-xl border-b backdrop-blur-sm bg-opacity-95 sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-2xl shadow-lg">
              </div>
              <div>
                <h1 className={`text-xl sm:text-2xl lg:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent`}>
                Quakemon
                </h1>
                <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-sm sm:text-base lg:text-lg`}>
                  Data Real-time, Riwayat M≥5.0, dan Gempa Dirasakan
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:gap-4">
              {hasNewData && (
                <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full text-xs sm:text-sm font-medium animate-pulse shadow-lg">
                  <Zap className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Data Baru!</span>
                  <span className="sm:hidden">Baru!</span>
                </div>
              )}
              <button
                onClick={() => setAutoUpdate(!autoUpdate)}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 ${
                  autoUpdate 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {autoUpdate ? <Bell className="h-3 w-3 sm:h-4 sm:w-4" /> : <BellOff className="h-3 w-3 sm:h-4 sm:w-4" />}
                <span className="hidden sm:inline">Auto Update</span>
                <span className="sm:hidden">Auto</span>
              </button>
              <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 rounded-xl text-xs sm:text-sm font-medium ${
                isOnline 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {isOnline ? <Wifi className="h-3 w-3 sm:h-4 sm:w-4" /> : <WifiOff className="h-3 w-3 sm:h-4 sm:w-4" />}
                <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
              </div>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 sm:p-3 rounded-xl transition-all duration-300 ${
                  darkMode 
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-lg' 
                    : 'bg-gray-800 text-white hover:bg-gray-900 shadow-lg'
                }`}
              >
                {darkMode ? <Sun className="h-4 w-4 sm:h-5 sm:w-5" /> : <Moon className="h-4 w-4 sm:h-5 sm:w-5" />}
              </button>
              <button
                onClick={() => fetchAllEarthquakeData()}
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-2 sm:p-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl"
              >
                <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} rounded-2xl shadow-xl p-2 flex flex-col sm:flex-row gap-2 border backdrop-blur-sm bg-opacity-95`}>
          <button
            onClick={() => setActiveTab('latest')}
            className={`flex-1 flex items-center justify-center gap-2 sm:gap-3 py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-semibold transition-all duration-300 text-sm sm:text-base ${
              activeTab === 'latest' 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-[1.02]' 
                : `${darkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`
            }`}
          >
            <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Gempa Terbaru</span>
            <span className="sm:hidden">Terbaru</span>
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex-1 flex items-center justify-center gap-2 sm:gap-3 py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-semibold transition-all duration-300 text-sm sm:text-base ${
              activeTab === 'recent' 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-[1.02]' 
                : `${darkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`
            }`}
          >
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">15 Gempa M≥5.0</span>
            <span className="sm:hidden">M≥5.0</span>
            {recentEarthquakes.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                {recentEarthquakes.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('felt')}
            className={`flex-1 flex items-center justify-center gap-2 sm:gap-3 py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-semibold transition-all duration-300 text-sm sm:text-base ${
              activeTab === 'felt' 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-[1.02]' 
                : `${darkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`
            }`}
          >
            <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">15 Gempa Dirasakan</span>
            <span className="sm:hidden">Dirasakan</span>
            {feltEarthquakes.length > 0 && (
              <span className="bg-purple-500 text-white text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                {feltEarthquakes.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
        {activeTab === 'latest' && latestEarthquake && magnitudeInfo && dateTime && coordinates && (
          <div className="space-y-8">
            {/* Latest Earthquake Card */}
            <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} rounded-3xl shadow-2xl border-2 ${magnitudeInfo.borderColor} overflow-hidden backdrop-blur-sm bg-opacity-95`}>
              <div className={`${magnitudeInfo.bgColor} px-8 py-6 border-b ${magnitudeInfo.borderColor}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{magnitudeInfo.icon}</span>
                    <div>
                      <h2 className={`text-2xl font-bold ${magnitudeInfo.color}`}>
                        {magnitudeInfo.classification}
                      </h2>
                      <p className={`text-lg ${magnitudeInfo.color} opacity-75`}>
                        Magnitudo {latestEarthquake.Magnitude}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Terakhir Update</p>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {lastUpdated?.toLocaleTimeString('id-ID')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Location & Time */}
                  <div className="space-y-4 sm:space-y-6">
                    <div className="flex items-start gap-4">
                      <MapPin className="h-6 w-6 text-red-500 mt-1 flex-shrink-0" />
                      <div>
                        <p className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'} text-base sm:text-lg`}>Lokasi</p>
                        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} text-sm sm:text-lg`}>{latestEarthquake.Wilayah}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <Clock className="h-6 w-6 text-blue-500 mt-1 flex-shrink-0" />
                      <div>
                        <p className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'} text-base sm:text-lg`}>Waktu Kejadian</p>
                        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} text-sm sm:text-lg`}>{dateTime.wib}</p>
                        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} text-xs sm:text-sm`}>{dateTime.utc}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <Layers className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                      <div>
                        <p className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'} text-base sm:text-lg`}>Kedalaman</p>
                        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} text-sm sm:text-lg`}>{latestEarthquake.Kedalaman}</p>
                      </div>
                    </div>

                    {latestEarthquake.Dirasakan && (
                      <div className="flex items-start gap-4">
                        <Users className="h-6 w-6 text-purple-500 mt-1 flex-shrink-0" />
                        <div>
                          <p className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'} text-base sm:text-lg`}>Dirasakan</p>
                          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} text-xs sm:text-sm`}>{latestEarthquake.Dirasakan}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Coordinates & Tsunami */}
                  <div className="space-y-4 sm:space-y-6">
                    <div className="flex items-start gap-4">
                      <Globe className="h-6 w-6 text-indigo-500 mt-1 flex-shrink-0" />
                      <div>
                        <p className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'} text-base sm:text-lg`}>Koordinat</p>
                        {coordinates.lat && coordinates.lng ? (
                          <>
                            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} text-sm sm:text-lg`}>{coordinates.lat}°</p>
                            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} text-sm sm:text-lg`}>{coordinates.lng}°</p>
                            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} text-sm`}>({latestEarthquake.coordinates})</p>
                          </>
                        ) : (
                          <>
                            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} text-sm sm:text-lg`}>{latestEarthquake.Lintang}</p>
                            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} text-sm sm:text-lg`}>{latestEarthquake.Bujur}</p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <AlertTriangle className="h-6 w-6 text-orange-500 mt-1 flex-shrink-0" />
                      <div>
                        <p className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'} text-base sm:text-lg`}>Potensi Tsunami</p>
                        <span className={`inline-block px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium ${
                          latestEarthquake.Potensi.toLowerCase().includes('tidak') 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                        }`}>
                          {latestEarthquake.Potensi}
                        </span>
                      </div>
                    </div>

                    {shakemapUrl && (
                      <div className="flex items-start gap-4">
                        <Camera className="h-6 w-6 text-purple-500 mt-1 flex-shrink-0" />
                        <div>
                          <p className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'} text-base sm:text-lg`}>Shakemap</p>
                          <a
                            href={shakemapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline break-all transition-colors duration-300 text-xs sm:text-sm"
                          >
                            Lihat Peta Guncangan
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Shakemap Image */}
            {shakemapUrl && (
              <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} rounded-3xl shadow-2xl p-8 border backdrop-blur-sm bg-opacity-95`}>
                <h3 className={`text-2xl font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'} mb-6 flex items-center gap-3`}>
                  <Camera className="h-6 w-6 text-purple-500" />
                  Peta Guncangan (Shakemap)
                </h3>
                <div className="rounded-2xl overflow-hidden border shadow-lg">
                  <img
                    src={shakemapUrl}
                    alt="Shakemap Gempa"
                    className="w-full h-auto"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
{/*                 <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-4`}>
                  URL: {shakemapUrl}
                </p> */}
              </div>
            )}
          </div>
        )}

        {activeTab === 'recent' && (
          <div className="space-y-8">
            <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} rounded-3xl shadow-2xl p-8 border backdrop-blur-sm bg-opacity-95`}>
              <h3 className={`text-2xl font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'} mb-4 flex items-center gap-3`}>
                <TrendingUp className="h-6 w-6 text-blue-500" />
                15 Gempa M≥5.0 Terbaru
              </h3>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-8 text-lg`}>
                Daftar gempa dengan magnitudo 5.0 atau lebih yang tercatat BMKG
              </p>
              
              {recentEarthquakes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {recentEarthquakes.map((earthquake, index) => 
                    renderEarthquakeCard(earthquake, index, false)
                  )}
                </div>
              ) : (
                <div className="text-center py-16">
                  <List className={`h-16 w-16 ${darkMode ? 'text-gray-600' : 'text-gray-400'} mx-auto mb-6`} />
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} text-lg`}>Data gempa M≥5.0 tidak tersedia</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'felt' && (
          <div className="space-y-8">
            <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} rounded-3xl shadow-2xl p-8 border backdrop-blur-sm bg-opacity-95`}>
              <h3 className={`text-2xl font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'} mb-4 flex items-center gap-3`}>
                <Heart className="h-6 w-6 text-red-500" />
                15 Gempa Dirasakan Terbaru
              </h3>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-8 text-lg`}>
                Daftar gempa yang dirasakan masyarakat berdasarkan laporan BMKG
              </p>
              
              {feltEarthquakes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {feltEarthquakes.map((earthquake, index) => 
                    renderEarthquakeCard(earthquake, index, true)
                  )}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Users className={`h-16 w-16 ${darkMode ? 'text-gray-600' : 'text-gray-400'} mx-auto mb-6`} />
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} text-lg`}>Data gempa dirasakan tidak tersedia</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Classification Guide */}
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} rounded-3xl shadow-2xl p-8 mt-8 border backdrop-blur-sm bg-opacity-95`}>
          <h3 className={`text-xl sm:text-2xl font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'} mb-4 sm:mb-6`}>Klasifikasi Magnitudo</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className={`flex items-center gap-3 sm:gap-4 p-4 sm:p-6 ${darkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'} rounded-2xl border`}>
              <span className="text-3xl">🟢</span>
              <div>
                <p className={`font-semibold text-base sm:text-lg ${darkMode ? 'text-green-400' : 'text-green-800'}`}>Gempa Ringan</p>
                <p className={`text-sm sm:text-base ${darkMode ? 'text-green-300' : 'text-green-600'}`}>M &lt; 5.0</p>
              </div>
            </div>
            <div className={`flex items-center gap-3 sm:gap-4 p-4 sm:p-6 ${darkMode ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-200'} rounded-2xl border`}>
              <span className="text-3xl">🟡</span>
              <div>
                <p className={`font-semibold text-base sm:text-lg ${darkMode ? 'text-yellow-400' : 'text-yellow-800'}`}>Gempa Sedang</p>
                <p className={`text-sm sm:text-base ${darkMode ? 'text-yellow-300' : 'text-yellow-600'}`}>5.0 &le; M &lt; 6.0</p>
              </div>
            </div>
            <div className={`flex items-center gap-3 sm:gap-4 p-4 sm:p-6 ${darkMode ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'} rounded-2xl border`}>
              <span className="text-3xl">🔴</span>
              <div>
                <p className={`font-semibold text-base sm:text-lg ${darkMode ? 'text-red-400' : 'text-red-800'}`}>Gempa Kuat</p>
                <p className={`text-sm sm:text-base ${darkMode ? 'text-red-300' : 'text-red-600'}`}>M &ge; 6.0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Information */}
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} rounded-3xl shadow-2xl p-8 mt-8 border backdrop-blur-sm bg-opacity-95`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-sm sm:text-base lg:text-lg`}>
                📡 Sumber data: Badan Meteorologi, Klimatologi, dan Geofisika (BMKG)
              </p>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-2 text-xs sm:text-sm`}>
                Data XML & JSON diperbarui otomatis setiap 30 detik • Terakhir diperbarui: {lastUpdated?.toLocaleString('id-ID')}
              </p>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1 text-xs sm:text-sm`}>
                Endpoint: autogempa.xml, gempaterkini.json, gempadirasakan.json
              </p>
            </div>
            <a
              href="https://www.bmkg.go.id"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium underline transition-colors duration-300 text-sm sm:text-base lg:text-lg"
            >
              www.bmkg.go.id
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
