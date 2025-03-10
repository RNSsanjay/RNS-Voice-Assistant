import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

const VoiceAssistant = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioData, setAudioData] = useState([]);
  const [transcription, setTranscription] = useState("");
  const [audioResponse, setAudioResponse] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [visualizerData, setVisualizerData] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [colors, setColors] = useState(['#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#10B981', '#3B82F6']);

  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = async (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        setTranscription(transcript);

        // Add user message to chat history
        setChatHistory(prev => [...prev, { type: 'user', text: transcript }]);

        // Set thinking state
        setIsThinking(true);

        // Send to backend
        await sendToBackend(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsThinking(false);
      };

      recognitionRef.current.onend = () => {
        if (isRecording) {
          recognitionRef.current.start();
        }
      };
    }

    // Initialize audio context for visualizer
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioContextRef.current = audioContext;
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording]);

  // Scroll to bottom of chat when history updates
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Handle audio playback and visualizer
  useEffect(() => {
    if (audioRef.current && audioResponse) {
      audioRef.current.onplay = () => {
        setIsPlaying(true);
        setIsRecording(false); // Turn off microphone when playing audio

        // Connect audio element to analyser for visualization
        const audioSource = audioContextRef.current.createMediaElementSource(audioRef.current);
        audioSource.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);

        // Start visualization
        visualize();
      };

      audioRef.current.onpause = () => {
        setIsPlaying(false);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };

      audioRef.current.onended = () => {
        setIsPlaying(false);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [audioResponse]);

  const visualize = () => {
    if (!analyserRef.current || !isPlaying) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Get visualization data (only use a portion of the frequency data)
    const visData = Array.from(dataArray.slice(0, 32));
    setVisualizerData(visData);

    // Continue visualization loop
    animationFrameRef.current = requestAnimationFrame(visualize);
  };

  const sendToBackend = async (text) => {
    try {
      setIsThinking(true);

      // Send text to backend
      const response = await axios.post("http://127.0.0.1:8000/process/", { text }, { responseType: "blob" });

      // Convert response to audio URL
      const audioBlob = new Blob([response.data], { type: "audio/mp3" });
      const audioURL = URL.createObjectURL(audioBlob);
      setAudioResponse(audioURL);

      // Add bot response to chat history
      setChatHistory(prev => [...prev, { type: 'bot', audioURL }]);

      setIsThinking(false);

      // Shuffle colors for visual interest
      setColors([...colors].sort(() => Math.random() - 0.5));

    } catch (error) {
      console.error("Error sending text to backend:", error);
      setIsThinking(false);

      // Add error message to chat history
      setChatHistory(prev => [...prev, {
        type: 'system',
        text: "Sorry, I encountered an error processing your request."
      }]);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
    setIsRecording(!isRecording);
  };

  // Get visualizer bar style based on index and value
  const getBarStyle = (value, index) => {
    const height = Math.max(4, (value / 255) * 100);
    const colorIndex = index % colors.length;

    return {
      height: `${height}%`,
      backgroundColor: colors[colorIndex],
      opacity: 0.8 + (value / 255) * 0.2,
      boxShadow: `0 0 ${(value / 255) * 10 + 5}px ${colors[colorIndex]}`,
    };
  };

  // Clear chat history
  const clearChat = () => {
    setChatHistory([]);
    setTranscription("");
    setAudioResponse(null);
  };

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-900 text-white p-4">
      {/* Header */}
      <header className="w-full max-w-4xl flex justify-between items-center mb-6 p-4 bg-black bg-opacity-30 rounded-lg backdrop-blur-sm">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          RNS Voice Assistant
        </h1>

        {/* Audio Visualizer */}
        <div className="h-12 flex items-end space-x-1">
          {isPlaying ? (
            visualizerData.slice(0, 16).map((value, index) => (
              <div
                key={index}
                className="w-1 rounded-t-sm transition-all duration-75 ease-out"
                style={getBarStyle(value, index)}
              />
            ))
          ) : (
            // Placeholder bars when not playing
            Array(10).fill(0).map((_, index) => (
              <div
                key={index}
                className="w-1 bg-gray-600 rounded-t-sm opacity-50"
                style={{ height: `${4 + (index % 3) * 3}px` }}
              />
            ))
          )}
        </div>

        {/* Clear button */}
        <button
          onClick={clearChat}
          className="text-sm px-3 py-1 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
        >
          Clear Chat
        </button>
      </header>

      {/* Main content area */}
      <div className="w-full max-w-4xl flex-1 flex flex-col mb-4">
        {/* Chat history */}
        <div
          ref={chatContainerRef}
          className="flex-1 flex flex-col space-y-4 overflow-y-auto p-4 bg-black bg-opacity-30 rounded-lg backdrop-blur-sm mb-4 max-h-96"
        >
          {chatHistory.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 italic">
              Start a conversation...
            </div>
          ) : (
            chatHistory.map((message, index) => (
              <div
                key={index}
                className={`max-w-3/4 flex items-center ${
                  message.type === 'user'
                    ? 'self-end flex-row-reverse'
                    : message.type === 'bot'
                      ? 'self-start'
                      : 'self-center'
                } p-3 shadow-lg`}
              >
                {message.type === 'bot' && (
                  <button
                    onClick={() => {
                      setAudioResponse(message.audioURL);
                      audioRef.current.play();
                    }}
                    className="w-12 h-12 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center shadow-lg shadow-green-600/50 mr-3"
                    disabled={isPlaying}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                )}
                {message.type === 'user' && (
                  <div
                    className="bg-indigo-600 rounded-xl rounded-br-sm p-3"
                  >
                    <p>{message.text}</p>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Thinking indicator */}
          {isThinking && (
            <div className="self-start bg-purple-600 rounded-xl rounded-bl-sm p-3 shadow-lg">
              <div className="flex space-x-2">
                <div className="w-2 h-2 rounded-full bg-white animate-bounce" style={{animationDelay: "0ms"}}></div>
                <div className="w-2 h-2 rounded-full bg-white animate-bounce" style={{animationDelay: "150ms"}}></div>
                <div className="w-2 h-2 rounded-full bg-white animate-bounce" style={{animationDelay: "300ms"}}></div>
              </div>
            </div>
          )}
        </div>

        {/* Voice controls */}
        <div className="flex items-center justify-center gap-6 p-4 bg-black bg-opacity-30 rounded-lg backdrop-blur-sm">
          {/* Record Button */}
          <button
            onClick={toggleRecording}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
              isRecording
                ? 'bg-red-600 animate-pulse shadow-red-600/50'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/50'
            }`}
          >
            <div className="text-white text-sm font-bold">
              {isRecording ? "STOP" : "REC"}
            </div>
          </button>

          {/* Current transcription */}
          <div className="flex-1 bg-gray-800 bg-opacity-50 rounded-lg p-3">
            <p className="text-gray-400 text-xs mb-1">You said:</p>
            <p className="text-blue-300 text-sm italic">
              {transcription || (isRecording ? "Listening..." : "Click REC to start")}
            </p>
          </div>
        </div>
      </div>

      {/* Large DJ Visualizer - appears when audio is playing */}
      {isPlaying && (
        <div className="w-full max-w-4xl h-32 flex items-end justify-center gap-1 mb-6 bg-black bg-opacity-30 rounded-lg p-4 backdrop-blur-sm">
          {visualizerData.map((value, index) => (
            <div
              key={index}
              className="w-3 rounded-t-lg transition-all duration-75 ease-out"
              style={getBarStyle(value, index)}
            />
          ))}
        </div>
      )}

      {/* Hidden audio element */}
      <audio ref={audioRef} src={audioResponse} className="hidden" />
    </div>
  );
};

export default VoiceAssistant;
