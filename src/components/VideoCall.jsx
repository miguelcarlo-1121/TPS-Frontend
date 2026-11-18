import { useState, useRef, useEffect } from "react";
import { apiFetch } from "../auth";
import AgoraRTC, {
  AgoraRTCProvider,
  useJoin,
  useLocalCameraTrack,
  useLocalMicrophoneTrack,
  useRemoteUsers,
  RemoteUser,
  usePublish,
} from "agora-rtc-react";
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, Users, 
  Maximize, Minimize, MessageSquare, Shield 
} from "lucide-react";

const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

function LocalVideo({ track }) {
  const ref = useRef(null);
  useEffect(() => {
    if (track && ref.current) {
      track.play(ref.current);
    }
    return () => {
      if (track) track.stop();
    };
  }, [track]);
  
  // scale-x-[-1] = mirror effect para natural tignan ang sarili
  return <div ref={ref} className="h-full w-full object-cover scale-x-[-1]" />;
}

function CallUI({ appointmentId, onLeave }) {
  const [calling, setCalling] = useState(false);
  const [tokenData, setTokenData] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  const { localMicrophoneTrack } = useLocalMicrophoneTrack();
  const { localCameraTrack } = useLocalCameraTrack();
  const remoteUsers = useRemoteUsers();

  useJoin(
    tokenData
      ? {
          appid: tokenData.appId,
          channel: tokenData.channelName,
          token: tokenData.token,
          uid: tokenData.uid,
        }
      : null,
    calling
  );

  usePublish([localMicrophoneTrack, localCameraTrack]);

  const startCall = async () => {
    try {
      const data = await apiFetch("/agora/token", {
        method: "POST",
        body: JSON.stringify({ appointment_id: appointmentId }),
      });
      setTokenData(data);
      setCalling(true);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const toggleMic = async () => {
    if (localMicrophoneTrack) {
      await localMicrophoneTrack.setMuted(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleCam = async () => {
    if (localCameraTrack) {
      await localCameraTrack.setMuted(!isCamOff);
      setIsCamOff(!isCamOff);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const leaveCall = () => {
    setCalling(false);
    onLeave();
  };

  // Layout Logic: Grid na umaayon sa dami ng tao
  const getGridClass = () => {
    const total = remoteUsers.length + 1; // +1 para sa local
    if (showSidebar) return "grid-cols-1 md:grid-cols-2"; // Kapag may sidebar
    if (total === 1) return "grid-cols-1 max-w-5xl mx-auto";
    if (total === 2) return "grid-cols-1 md:grid-cols-2 max-w-6xl mx-auto";
    return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"; // 3 pataas
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex flex-col bg-[#202124] text-white font-sans overflow-hidden"
    >
      
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 bg-[#202124] border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
             <Shield size={18} className="text-green-400" />
             <h2 className="text-sm sm:text-base font-medium tracking-wide truncate max-w-[200px] sm:max-w-md">
               {tokenData?.channelName?.replace("-", " ").toUpperCase()}
             </h2>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="hidden sm:flex bg-white/10 text-xs px-3 py-1 rounded-full items-center gap-1">
             <Users size={12} /> {remoteUsers.length + (calling ? 1 : 0)}
          </span>
          <button onClick={toggleFullscreen} className="p-2 hover:bg-white/10 rounded-full transition">
             {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>
      </div>

      {/* MAIN AREA */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* VIDEO GRID */}
        <div className="flex-1 p-2 sm:p-4 overflow-y-auto">
          {!calling ? (
             <div className="h-full flex flex-col items-center justify-center gap-6">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-4">
                   <Video size={48} className="text-tf-teal" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-light text-center px-4">Ready to join?</h1>
                <button
                  onClick={startCall}
                  className="bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124] px-8 py-3 rounded-full font-medium text-lg transition shadow-lg"
                >
                  Join Now
                </button>
             </div>
          ) : (
            <div className={`grid gap-2 sm:gap-4 w-full h-full items-center ${getGridClass()}`}>
              
              {/* REMOTE USERS */}
              {remoteUsers.map((user) => (
                <div
                  key={user.uid}
                  className="relative w-full aspect-video bg-[#3c4043] rounded-lg sm:rounded-xl overflow-hidden shadow-lg group"
                >
                  <RemoteUser user={user} />
                  <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[10px] sm:text-xs font-medium">
                    Participant {user.uid}
                  </div>
                </div>
              ))}

              {/* LOCAL USER */}
              {localCameraTrack && (
                <div className="relative w-full aspect-video bg-[#3c4043] rounded-lg sm:rounded-xl overflow-hidden shadow-lg group">
                  {isCamOff ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#3c4043]">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#5f6368] rounded-full flex items-center justify-center text-xl sm:text-2xl font-medium">
                        You
                      </div>
                    </div>
                  ) : (
                    <LocalVideo track={localCameraTrack} />
                  )}
                  <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[10px] sm:text-xs font-medium flex items-center gap-2">
                    You {isMuted && <MicOff size={12} className="text-red-400" />}
                  </div>
                </div>
              )}

              {/* WAITING STATE */}
              {remoteUsers.length === 0 && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-2 rounded-full backdrop-blur-md text-sm animate-pulse flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                  Waiting for others to join...
                </div>
              )}
            </div>
          )}
        </div>

        {/* SIDEBAR (Participants) */}
        <div className={`absolute top-0 right-0 h-full w-full sm:w-80 bg-[#2d2e30] border-l border-white/10 transform transition-transform duration-300 ease-in-out z-20 flex flex-col ${showSidebar ? "translate-x-0" : "translate-x-full"}`}>
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-medium">Participants</h3>
              <button onClick={() => setShowSidebar(false)} className="sm:hidden text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                <div className="w-8 h-8 bg-tf-teal rounded-full flex items-center justify-center text-xs font-bold text-[#202124]">Me</div>
                <span className="text-sm flex-1">You (Host)</span>
                {isMuted ? <MicOff size={14} className="text-red-400" /> : <Mic size={14} className="text-gray-400" />}
              </div>
              {remoteUsers.map((u) => (
                <div key={u.uid} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition">
                  <div className="w-8 h-8 bg-[#5f6368] rounded-full flex items-center justify-center text-xs">
                    P
                  </div>
                  <span className="text-sm flex-1 truncate">Participant {u.uid}</span>
                </div>
              ))}
            </div>
        </div>
      </div>

      {/* CONTROLS BAR */}
      {calling && (
        <div className="shrink-0 flex items-center justify-center gap-2 sm:gap-3 py-3 sm:py-6 bg-[#202124] w-full z-30">
          <div className="flex items-center gap-2 sm:gap-4 bg-[#3c4043] px-4 sm:px-6 py-2 sm:py-3 rounded-full shadow-2xl border border-white/5">
            
            <button
              onClick={toggleMic}
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
                isMuted ? "bg-[#ea4335] hover:bg-red-600 shadow-[0_0_15px_rgba(234,67,53,0.5)]" : "bg-[#4a4d51] hover:bg-[#5f6368]"
              }`}
            >
              {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <button
              onClick={toggleCam}
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
                isCamOff ? "bg-[#ea4335] hover:bg-red-600 shadow-[0_0_15px_rgba(234,67,53,0.5)]" : "bg-[#4a4d51] hover:bg-[#5f6368]"
              }`}
            >
              {isCamOff ? <VideoOff size={18} /> : <Video size={18} />}
            </button>

            <button
              onClick={leaveCall}
              className="w-12 h-10 sm:w-16 sm:h-12 bg-[#ea4335] hover:bg-red-600 rounded-full flex items-center justify-center transition-all shadow-[0_0_15px_rgba(234,67,53,0.4)] mx-1 sm:mx-2"
            >
              <PhoneOff size={20} />
            </button>

            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
                showSidebar ? "bg-tf-teal text-white" : "bg-[#4a4d51] hover:bg-[#5f6368]"
              }`}
            >
              <Users size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VideoCall(props) {
  return (
    <AgoraRTCProvider client={client}>
      <CallUI {...props} />
    </AgoraRTCProvider>
  );
}