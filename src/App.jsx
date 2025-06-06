import { useState, useRef, useEffect } from 'react'
import './App.css'

const QUESTIONS = [
  "Introduce yourself, your name and your company title",
  "What challenge or need led you to work with We Build Bridges?",
  "What was the experience like working with us?",
  "Is there anything that stood out to you about working with us versus other options?",
  "What kind of work did you get done, and what did you think of the final product?",
  "What would you say to someone considering working with us?"
];

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasStartedTestimonial, setHasStartedTestimonial] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState(Array(QUESTIONS.length).fill(null));
  const [recordingUrls, setRecordingUrls] = useState(Array(QUESTIONS.length).fill(null));
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [processedStream, setProcessedStream] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(Array(QUESTIONS.length).fill('idle'));
  const [uploading, setUploading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameId = useRef(null);

  // Detect mobile device
  useEffect(() => {
    const checkIfMobile = () => {
      const mobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(mobile);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    const password = e.target.password.value;
    if (password === 'password123') {
      setIsAuthenticated(true);
    } else {
      alert('Incorrect password');
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      setupCamera();
    }
    
    // Cleanup function
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      if (processedStream) {
        processedStream.getTracks().forEach(track => track.stop());
      }
      // Clean up all object URLs
      recordingUrls.forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [isAuthenticated]);

  const setupCamera = async () => {
    try {
      // Get a wide stream on mobile to ensure we have data to fill the vertical canvas
      const constraints = {
        video: isMobile
          ? {
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              facingMode: 'user'
            }
          : { 
              width: { ideal: 1920 }, 
              height: { ideal: 1080 },
              facingMode: 'user'
            },
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // Mute the hidden video element
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Please allow camera and microphone access to continue.');
    }
  };

  const processVideoForMobile = () => {
    if (!isMobile || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    const portraitWidth = 720;
    const portraitHeight = 1280;
    canvas.width = portraitWidth;
    canvas.height = portraitHeight;

    const draw = () => {
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      const videoAspectRatio = videoWidth / videoHeight;
      const canvasAspectRatio = canvas.width / canvas.height;

      let sWidth, sHeight, sx, sy;

      // This logic crops the wide video source to fit the tall canvas, simulating object-fit: cover
      if (videoAspectRatio > canvasAspectRatio) {
        sHeight = videoHeight;
        sWidth = videoHeight * canvasAspectRatio;
        sx = (videoWidth - sWidth) / 2;
        sy = 0;
      } else {
        sWidth = videoWidth;
        sHeight = videoWidth / canvasAspectRatio;
        sx = 0;
        sy = (videoHeight - sHeight) / 2;
      }
      
      context.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
      animationFrameId.current = requestAnimationFrame(draw);
    };
    draw();
    
    const stream = canvas.captureStream(30);
    const audioTracks = cameraStream.getAudioTracks();
    if(audioTracks.length > 0) {
      stream.addTrack(audioTracks[0]);
    }
    setProcessedStream(stream);
  }

  const startRecording = async () => {
    const streamToRecord = (isMobile && processedStream) ? processedStream : cameraStream;
    if (!streamToRecord) {
      alert('Camera not ready. Please try again.');
      return;
    }

    try {
      const recorder = new MediaRecorder(streamToRecord, { 
        mimeType: 'video/webm;codecs=vp9' 
      });
      const chunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        // Clean up previous recording URL for this question
        if (recordingUrls[currentQuestion]) {
          URL.revokeObjectURL(recordingUrls[currentQuestion]);
        }
        
        const newRecordings = [...recordings];
        const newRecordingUrls = [...recordingUrls];
        newRecordings[currentQuestion] = blob;
        newRecordingUrls[currentQuestion] = url;
        setRecordings(newRecordings);
        setRecordingUrls(newRecordingUrls);
        
        // Reset upload status for this question
        const newUploadStatus = [...uploadStatus];
        newUploadStatus[currentQuestion] = 'idle';
        setUploadStatus(newUploadStatus);

        // Switch video element to show the recorded video
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.src = url;
          videoRef.current.muted = false;
          videoRef.current.controls = true;
          videoRef.current.currentTime = 0;
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Error starting recording. Please try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setMediaRecorder(null);
      setIsRecording(false);
    }
  };

  const uploadVideoToMux = async (videoBlob, questionIndex) => {
    try {
      // Update status to uploading
      const newUploadStatus = [...uploadStatus];
      newUploadStatus[questionIndex] = 'uploading';
      setUploadStatus(newUploadStatus);

      // Get the direct upload URL from our Netlify Function
      const uploadUrlResponse = await fetch('/api/create-upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: `testimonial-question-${questionIndex + 1}.webm`
        })
      });

      if (!uploadUrlResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, assetId } = await uploadUrlResponse.json();

      // Upload directly to Mux
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: videoBlob,
        headers: {
          'Content-Type': 'video/webm'
        }
      });

      if (uploadResponse.ok) {
        console.log('Upload successful to Mux:', assetId);
        
        // Update status to uploaded
        newUploadStatus[questionIndex] = 'uploaded';
        setUploadStatus(newUploadStatus);
        
        return { assetId, uploadUrl };
      } else {
        throw new Error('Upload to Mux failed');
      }
    } catch (error) {
      console.error('Error uploading video:', error);
      
      // Update status to error
      const newUploadStatus = [...uploadStatus];
      newUploadStatus[questionIndex] = 'error';
      setUploadStatus(newUploadStatus);
      
      throw error;
    }
  };

  const handleNext = async () => {
    // Upload current video in background if it exists and hasn't been uploaded
    if (recordings[currentQuestion] && uploadStatus[currentQuestion] === 'idle') {
      try {
        setUploading(true);
        await uploadVideoToMux(recordings[currentQuestion], currentQuestion);
      } catch (error) {
        console.error('Background upload failed:', error);
      } finally {
        setUploading(false);
      }
    }

    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const retakeVideo = () => {
    // Clean up current recording
    if (recordingUrls[currentQuestion]) {
      URL.revokeObjectURL(recordingUrls[currentQuestion]);
    }
    
    const newRecordings = [...recordings];
    const newRecordingUrls = [...recordingUrls];
    newRecordings[currentQuestion] = null;
    newRecordingUrls[currentQuestion] = null;
    setRecordings(newRecordings);
    setRecordingUrls(newRecordingUrls);
    
    // Reset upload status
    const newUploadStatus = [...uploadStatus];
    newUploadStatus[currentQuestion] = 'idle';
    setUploadStatus(newUploadStatus);

    // Reset video element to live camera
    if (videoRef.current && cameraStream) {
      videoRef.current.src = '';
      videoRef.current.srcObject = cameraStream;
      videoRef.current.muted = true;
      setIsVideoPlaying(false);
    }
  };

  const replayVideo = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setIsVideoPlaying(true);
    }
  };

  const handleSubmit = async () => {
    setUploading(true);
    
    try {
      // Upload any remaining videos that haven't been uploaded
      for (let i = 0; i < recordings.length; i++) {
        if (recordings[i] && uploadStatus[i] === 'idle') {
          await uploadVideoToMux(recordings[i], i);
        }
      }
      
      setIsSubmitted(true);
    } catch (error) {
      console.error('Error during final submission:', error);
      alert('Error uploading videos. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Update video element when changing questions
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      if (recordings[currentQuestion]) {
        // When showing a previous recording, hide the canvas and show the video element
        if (isMobile && canvasRef.current) {
          canvasRef.current.style.display = 'none';
        }
        videoRef.current.style.display = 'block';
        videoRef.current.srcObject = null;
        videoRef.current.src = recordingUrls[currentQuestion];
        videoRef.current.muted = false;
        setIsVideoPlaying(false); // Reset to show replay button initially
      } else {
        // When showing the live feed, show the canvas (on mobile) or video (on desktop)
        if (isMobile && canvasRef.current) {
          canvasRef.current.style.display = 'block';
          videoRef.current.style.display = 'none';
        } else if (videoRef.current) {
           videoRef.current.style.display = 'block';
        }
        videoRef.current.src = '';
        videoRef.current.srcObject = cameraStream;
        videoRef.current.muted = true;
        setIsVideoPlaying(false);
      }
    }
  }, [currentQuestion, recordings, cameraStream, recordingUrls, isMobile, hasStartedTestimonial]);

  const getUploadStatusIndicator = (questionIndex) => {
    switch (uploadStatus[questionIndex]) {
      case 'uploading':
        return (
          <div className="upload-status uploading">
            <i className="fas fa-spinner fa-spin"></i>
            Uploading...
          </div>
        );
      case 'uploaded':
        return (
          <div className="upload-status uploaded">
            <i className="fas fa-check-circle"></i>
            Uploaded
          </div>
        );
      case 'error':
        return (
          <div className="upload-status error">
            <i className="fas fa-exclamation-triangle"></i>
            Failed
          </div>
        );
      default:
        return null;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container">
        <div className="content-card">
          <img src="/Red Logo.svg" alt="Logo" className="auth-logo" />
          <h2>Video Testimonials</h2>
          <p className="description-text">Please enter the password to access the testimonial recording.</p>
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              name="password"
              placeholder="Enter password"
              required
            />
            <button type="submit" className="btn-primary">
              <i className="fas fa-sign-in-alt"></i>
              Access Portal
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Splash screen with instructions
  if (isAuthenticated && !hasStartedTestimonial) {
    return (
      <div className="container">
        <div className="content-card">
          <img src="/Red Logo.svg" alt="Logo" className="auth-logo" />
          <h2>Ready to Record Your Testimonial?</h2>
          <p className="description-text">Before we begin, please follow these quick tips for the best recording experience:</p>
          
          <div className="instructions-list">
            <div className="instruction-item">
              <div className="instruction-icon">
                <i className="fas fa-lightbulb"></i>
              </div>
              <div className="instruction-text">Find good lighting</div>
            </div>
            
            <div className="instruction-item">
              <div className="instruction-icon">
                <i className="fas fa-headphones-alt"></i>
              </div>
              <div className="instruction-text">No AirPods / iPhone audio is better</div>
            </div>
            
            <div className="instruction-item">
              <div className="instruction-icon">
                <i className="fas fa-comments"></i>
              </div>
              <div className="instruction-text">Speak in your own voice. Whatever feels natural is probably best</div>
            </div>
            
            <div className="instruction-item">
              <div className="instruction-icon">
                <i className="fas fa-clock"></i>
              </div>
              <div className="instruction-text">Take your time - you can retake any question if needed</div>
            </div>
          </div>

          <button 
            onClick={() => setHasStartedTestimonial(true)}
            className="btn-primary begin-testimonial-btn"
          >
            <i className="fas fa-video"></i>
            Begin Testimonial
          </button>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="container">
        <div className="content-card">
          <div className="success-state">
            <div className="success-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <h2>Thank You!</h2>
            <p className="question-text">Your video testimonials have been successfully submitted.</p>
            <p className="question-text">Thanks for taking the time to do this! It really means a lot! - Chris</p>
          </div>
        </div>
      </div>
    );
  }

  const currentRecording = recordings[currentQuestion];
  const isLastQuestion = currentQuestion === QUESTIONS.length - 1;
  const hasRecordings = recordings.some(recording => recording !== null);

  return (
    <div className="container recording-mode">
      <div className="recording-interface">
        <div className={`video-container ${isMobile ? 'mobile' : ''}`}>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline
            controls={currentRecording && isVideoPlaying}
            onPlaying={processVideoForMobile}
            onPlay={() => setIsVideoPlaying(true)}
            onPause={() => setIsVideoPlaying(false)}
            onEnded={() => setIsVideoPlaying(false)}
            style={{ display: isMobile ? 'none' : 'block' }}
          />
          {isMobile && <canvas ref={canvasRef} />}

          {/* Replay button overlay for recorded videos */}
          {currentRecording && !isVideoPlaying && (
            <div className="replay-overlay">
              <div className="replay-button" onClick={replayVideo}>
                <i className="fas fa-play"></i>
              </div>
            </div>
          )}

          {/* Recording indicator */}
          {isRecording && (
            <div className="recording-indicator">
              <div className="recording-dot"></div>
              RECORDING
            </div>
          )}
          
          {!currentRecording && !isRecording && !isMobile && (
            <div className="recording-indicator live-preview">
              <i className="fas fa-eye"></i>
              LIVE PREVIEW
            </div>
          )}

          {/* Upload status */}
          <div className="upload-status-overlay">
            {getUploadStatusIndicator(currentQuestion)}
          </div>
        </div>

        {/* Overlay content */}
        <div className="overlay-content">
          {/* Top overlay - Progress and question */}
          <div className="top-overlay">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${((currentQuestion + 1) / QUESTIONS.length) * 100}%` }}
              ></div>
            </div>

            <div className="question-overlay">
              <div className="question-number">
                Question {currentQuestion + 1} of {QUESTIONS.length}
              </div>
              <div className="question-text" key={currentQuestion}>
                {QUESTIONS[currentQuestion]}
              </div>
            </div>
          </div>

          {/* Bottom overlay - Controls */}
          <div className="bottom-overlay">
            {/* Recording controls */}
            <div className="recording-controls">
              {!currentRecording ? (
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={uploading}
                  className={`control-button ${isRecording ? 'danger' : 'primary'}`}
                >
                  {isRecording ? (
                    <>
                      <i className="fas fa-stop"></i>
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <i className="fas fa-video"></i>
                      Start Recording
                    </>
                  )}
                </button>
              ) : (
                <button onClick={retakeVideo} className="control-button">
                  <i className="fas fa-redo"></i>
                  Retake Video
                </button>
              )}
            </div>

            {/* Navigation controls */}
            <div className="navigation-controls">
              <button
                onClick={handlePrevious}
                disabled={currentQuestion === 0 || uploading}
                className="control-button nav-button"
              >
                <i className="fas fa-chevron-left"></i>
                Previous
              </button>

              {isLastQuestion && hasRecordings ? (
                <button
                  onClick={handleSubmit}
                  disabled={uploading || !currentRecording}
                  className="control-button primary"
                >
                  {uploading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane"></i>
                      Submit All
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  disabled={currentQuestion === QUESTIONS.length - 1 || !currentRecording || uploading}
                  className="control-button primary nav-button"
                >
                  {uploading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Uploading...
                    </>
                  ) : (
                    <>
                      Next
                      <i className="fas fa-chevron-right"></i>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

