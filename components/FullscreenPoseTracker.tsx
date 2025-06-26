'use client';

import { useEffect, useRef, useState } from 'react';

interface PoseLandmark {
    x: number;
    y: number;
    z: number;
    visibility?: number;
}

interface HandLandmark {
    x: number;
    y: number;
    z: number;
}

interface PoseResults {
    poseLandmarks: PoseLandmark[];
    image: HTMLVideoElement;
}

interface HandResults {
    multiHandLandmarks: HandLandmark[][];
    multiHandedness: any[];
    image: HTMLVideoElement;
}

interface PoseDetectorProps {
    onPoseDetected?: (poseData: PoseLandmark[]) => void;
    onHandsDetected?: (handsData: HandLandmark[][]) => void;
    onPersonDetected?: (detected: boolean) => void;
    showVideo?: boolean;
    width?: number;
    height?: number;
    className?: string;
}

const PoseDetector: React.FC<PoseDetectorProps> = ({
    onPoseDetected,
    onHandsDetected,
    onPersonDetected,
    showVideo = true,
    width = 1600,
    height = 800,
    className = ""
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [personDetected, setPersonDetected] = useState<boolean>(false);
    const [poseData, setPoseData] = useState<PoseLandmark[] | null>(null);
    const [handsData, setHandsData] = useState<HandLandmark[][] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let pose: any = null;
        let hands: any = null;
        let camera: any = null;
        let lastPoseResults: PoseResults | null = null;
        let lastHandResults: HandResults | null = null;
        let isComponentMounted = true;
        let isInitializing = false;

        const drawResults = (): void => {
            if (!showVideo || !isComponentMounted) return;

            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw video frame
            const imageSource = lastHandResults?.image || lastPoseResults?.image;
            if (imageSource) {
                ctx.drawImage(imageSource, 0, 0, canvas.width, canvas.height);
            }

            // Draw pose if available
            if (lastPoseResults?.poseLandmarks) {
                drawPose(ctx, lastPoseResults.poseLandmarks);
            }

            // Draw hands if available
            if (lastHandResults?.multiHandLandmarks) {
                drawHands(ctx, lastHandResults.multiHandLandmarks);
            }
        };

        const drawPose = async (ctx: CanvasRenderingContext2D, landmarks: PoseLandmark[]): Promise<void> => {
            try {
                const { drawConnectors, drawLandmarks } = await import('@mediapipe/drawing_utils');
                const { POSE_CONNECTIONS } = await import('@mediapipe/pose');

                // Filter out arm connections to avoid overlap with hand detection
                const bodyConnections = POSE_CONNECTIONS.filter((connection: [number, number]) => {
                    const [start, end] = connection;
                    const armPoints = [15, 16, 17, 18, 19, 20, 21, 22];
                    return !armPoints.includes(start) && !armPoints.includes(end);
                });

                drawConnectors(ctx, landmarks, bodyConnections, {
                    color: '#00FF00',
                    lineWidth: 4
                });

                const bodyLandmarks = landmarks.filter((_, index) => {
                    const handWristPoints = [15, 16, 17, 18, 19, 20, 21, 22];
                    return !handWristPoints.includes(index);
                });

                drawLandmarks(ctx, bodyLandmarks, {
                    color: '#FF0000',
                    lineWidth: 2,
                    radius: 6
                });

                const armJoints = [11, 12, 13, 14];
                const armLandmarksToShow = landmarks.filter((_, index) => armJoints.includes(index));

                drawLandmarks(ctx, armLandmarksToShow, {
                    color: '#00FFFF',
                    lineWidth: 2,
                    radius: 8
                });
            } catch (error) {
                console.warn('Error drawing pose:', error);
            }
        };

        const drawHands = async (ctx: CanvasRenderingContext2D, handsLandmarks: HandLandmark[][]): Promise<void> => {
            try {
                const { drawConnectors, drawLandmarks } = await import('@mediapipe/drawing_utils');
                const { HAND_CONNECTIONS } = await import('@mediapipe/hands');

                const canvas = canvasRef.current;
                if (!canvas) return;

                for (const landmarks of handsLandmarks) {
                    drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
                        color: '#00CCFF',
                        lineWidth: 3
                    });

                    drawLandmarks(ctx, landmarks, {
                        color: '#FFFF00',
                        lineWidth: 2,
                        radius: 4
                    });

                    const fingertips = [4, 8, 12, 16, 20];
                    const colors = ['#FF0080', '#FF8000', '#80FF00', '#0080FF', '#8000FF'];

                    fingertips.forEach((tipIndex, i) => {
                        if (landmarks[tipIndex]) {
                            ctx.beginPath();
                            ctx.arc(
                                landmarks[tipIndex].x * canvas.width,
                                landmarks[tipIndex].y * canvas.height,
                                8,
                                0,
                                2 * Math.PI
                            );
                            ctx.fillStyle = colors[i];
                            ctx.fill();
                            ctx.strokeStyle = '#FFFFFF';
                            ctx.lineWidth = 2;
                            ctx.stroke();
                        }
                    });
                }
            } catch (error) {
                console.warn('Error drawing hands:', error);
            }
        };

        const initializeDetection = async (): Promise<void> => {
            if (isInitializing || !isComponentMounted) return;
            isInitializing = true;

            try {
                // Initialize pose detection first
                const { Pose } = await import('@mediapipe/pose');
                const { Camera } = await import('@mediapipe/camera_utils');

                if (!isComponentMounted) return;

                pose = new Pose({
                    locateFile: (file: string) => {
                        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
                    }
                });

                await pose.setOptions({
                    modelComplexity: 1,
                    smoothLandmarks: true,
                    enableSegmentation: false,
                    smoothSegmentation: true,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });

                if (!isComponentMounted) return;

                pose.onResults((results: PoseResults) => {
                    if (!isComponentMounted) return;

                    lastPoseResults = results;

                    if (results.poseLandmarks && results.poseLandmarks.length > 0) {
                        const detected = true;
                        setPersonDetected(detected);
                        setPoseData(results.poseLandmarks);

                        // Notify parent components
                        onPersonDetected?.(detected);
                        onPoseDetected?.(results.poseLandmarks);
                    } else {
                        const detected = false;
                        setPersonDetected(detected);
                        setPoseData(null);

                        onPersonDetected?.(detected);
                    }

                    drawResults();
                });

                // Initialize camera
                if (videoRef.current && isComponentMounted) {
                    camera = new Camera(videoRef.current, {
                        onFrame: async () => {
                            if (!isComponentMounted || !videoRef.current) return;

                            try {
                                if (pose) {
                                    await pose.send({ image: videoRef.current });
                                }
                                // Only send to hands if it's initialized and component is mounted
                                if (hands && isComponentMounted) {
                                    await hands.send({ image: videoRef.current });
                                }
                            } catch (e) {
                                // Ignore errors from disposed objects
                                const error = e as Error;
                                if (!error.message?.includes('deleted object')) {
                                    console.warn('Frame processing error:', e);
                                }
                            }
                        },
                        width,
                        height
                    });

                    await camera.start();

                    if (isComponentMounted) {
                        setIsLoading(false);

                        // Initialize hands detection after pose is stable
                        setTimeout(async () => {
                            if (!isComponentMounted) return;

                            try {
                                const { Hands } = await import('@mediapipe/hands');

                                if (!isComponentMounted) return;

                                hands = new Hands({
                                    locateFile: (file: string) => {
                                        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                                    }
                                });

                                await hands.setOptions({
                                    maxNumHands: 2,
                                    modelComplexity: 1,
                                    minDetectionConfidence: 0.5,
                                    minTrackingConfidence: 0.5
                                });

                                if (!isComponentMounted) return;

                                hands.onResults((results: HandResults) => {
                                    if (!isComponentMounted) return;

                                    lastHandResults = results;

                                    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                                        setHandsData(results.multiHandLandmarks);
                                        onHandsDetected?.(results.multiHandLandmarks);
                                    } else {
                                        setHandsData(null);
                                        onHandsDetected?.([]);
                                    }

                                    drawResults();
                                });
                            } catch (handError) {
                                console.warn('Hand detection failed to initialize, continuing with pose only:', handError);
                            }
                        }, 3000); // Increased delay
                    }
                }

            } catch (error) {
                console.error('Error initializing detection:', error);
                if (isComponentMounted) {
                    setError('Failed to initialize camera or detection systems');
                    setIsLoading(false);
                }
            } finally {
                isInitializing = false;
            }
        };

        initializeDetection();

        // Cleanup
        return () => {
            isComponentMounted = false;

            // Stop camera first
            if (camera) {
                try {
                    camera.stop();
                } catch (e) {
                    // Ignore cleanup errors
                }
                camera = null;
            }

            // Close MediaPipe instances with delay to ensure camera stops first
            setTimeout(() => {
                if (pose) {
                    try {
                        pose.close();
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                    pose = null;
                }

                if (hands) {
                    try {
                        hands.close();
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                    hands = null;
                }
            }, 100);
        };
    }, [onPoseDetected, onHandsDetected, onPersonDetected, showVideo, width, height]);

    // Helper functions
    const isInRange = (landmarks: PoseLandmark[] | null): boolean => {
        if (!landmarks || landmarks.length < 13) return false;

        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];

        if (leftShoulder && rightShoulder) {
            const shoulderDistance = Math.abs(leftShoulder.x - rightShoulder.x);
            return shoulderDistance > 0.15;
        }
        return false;
    };

    const getFingerCount = (): number => {
        if (!handsData) return 0;

        let totalFingers = 0;
        handsData.forEach(handLandmarks => {
            const fingertips = [4, 8, 12, 16, 20];
            fingertips.forEach(tipIndex => {
                if (handLandmarks[tipIndex]) {
                    totalFingers++;
                }
            });
        });

        return totalFingers;
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-4">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <p className="font-bold">Error:</p>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col items-center ${className}`}>
            {isLoading && (
                <div className="flex flex-col items-center space-y-4 mb-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    <p className="text-sm">Loading detection...</p>
                </div>
            )}

            {showVideo && (
                <div className="relative">
                    <video
                        ref={videoRef}
                        className="hidden"
                        width={width}
                        height={height}
                    />
                    <canvas
                        ref={canvasRef}
                        width={width}
                        height={height}
                        className="border-4 border-blue-500 rounded-lg shadow-lg"
                        style={{ transform: 'scaleX(-1)' }}
                    />
                </div>
            )}

            {!showVideo && (
                <video
                    ref={videoRef}
                    className="hidden"
                    width={width}
                    height={height}
                />
            )}

            {/* Status indicators */}
            <div className="mt-4 flex gap-6 text-sm">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${personDetected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                    <span>Person: {personDetected ? 'Yes' : 'No'}</span>
                </div>

                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${isInRange(poseData) ? 'bg-green-400' : 'bg-orange-400'}`}></div>
                    <span>In Range: {isInRange(poseData) ? 'Yes' : 'No'}</span>
                </div>

                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getFingerCount() > 0 ? 'bg-yellow-400' : 'bg-gray-400'}`}></div>
                    <span>Fingers: {getFingerCount()}</span>
                </div>
            </div>
        </div>
    );
};

// Main Fullscreen Wrapper Component
const FullscreenPoseTracker: React.FC = () => {
    const [viewportSize, setViewportSize] = useState({ width: 1920, height: 1080 });
    const [currentPose, setCurrentPose] = useState<PoseLandmark[] | null>(null);
    const [currentHands, setCurrentHands] = useState<HandLandmark[][] | null>(null);
    const [personDetected, setPersonDetected] = useState(false);
    const [detectionLogs, setDetectionLogs] = useState<string[]>([]);
    const [fpsCounter, setFpsCounter] = useState(0);
    const [lastFrameTime, setLastFrameTime] = useState(Date.now());

    // Get viewport dimensions
    useEffect(() => {
        const updateViewportSize = () => {
            setViewportSize({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };

        updateViewportSize();
        window.addEventListener('resize', updateViewportSize);
        return () => window.removeEventListener('resize', updateViewportSize);
    }, []);

    // Optimized FPS Counter (less frequent updates)
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const timeDiff = now - lastFrameTime;
            if (timeDiff > 0) {
                setFpsCounter(Math.round(1000 / timeDiff));
            }
            setLastFrameTime(now);
        }, 500); // Update every 500ms instead of 100ms

        return () => clearInterval(interval);
    }, [lastFrameTime]);

    // Add detection log (throttled to prevent spam)
    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}`;

        setDetectionLogs(prev => {
            // Only add if it's different from the last entry to prevent spam
            if (prev.length > 0 && prev[0].includes(message.split(':')[0])) {
                return prev; // Skip duplicate log types
            }

            const newLogs = [logEntry, ...prev];
            return newLogs.slice(0, 5); // Reduced to 5 logs max
        });
    };

    // Handle pose detection (throttled logging)
    const handlePoseDetected = (poseData: PoseLandmark[]) => {
        setCurrentPose(poseData);

        // Only log occasionally to prevent spam
        if (poseData.length > 0 && Math.random() < 0.1) { // 10% chance to log
            const nose = poseData[0];
            const leftShoulder = poseData[11];
            const rightShoulder = poseData[12];

            if (nose && leftShoulder && rightShoulder) {
                const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
                addLog(`Pose: ${poseData.length} points, width: ${shoulderWidth.toFixed(2)}`);
            }
        }
    };

    // Handle hands detection (throttled logging)
    const handleHandsDetected = (handsData: HandLandmark[][]) => {
        setCurrentHands(handsData);

        // Only log when hands state changes or occasionally
        const currentHandCount = handsData.length;
        const prevHandCount = currentHands?.length || 0;

        if (currentHandCount !== prevHandCount || (currentHandCount > 0 && Math.random() < 0.05)) {
            if (handsData.length > 0) {
                const fingerCount = handsData.reduce((sum, hand) => {
                    const fingertips = [4, 8, 12, 16, 20];
                    return sum + fingertips.filter(tip => hand[tip]).length;
                }, 0);
                addLog(`👋 ${handsData.length} hand(s), ${fingerCount} fingers`);
            }
        }
    };

    // Handle person detection (only log state changes)
    const handlePersonDetected = (detected: boolean) => {
        if (detected !== personDetected) {
            setPersonDetected(detected);
            addLog(detected ? '✅ Person detected' : '❌ Person lost');
        }
    };

    // Get detection statistics with proper hand tracking
    const getStats = () => {
        const poseCount = currentPose?.length || 0;
        const handCount = currentHands?.length || 0;

        // Calculate finger count using the same logic as PoseDetector
        const fingerCount = currentHands?.reduce((total, handLandmarks) => {
            const fingertips = [4, 8, 12, 16, 20];
            return total + fingertips.filter(tipIndex => handLandmarks[tipIndex]).length;
        }, 0) || 0;

        // Check if person is in range (same as PoseDetector)
        const isInRange = () => {
            if (!currentPose || currentPose.length < 13) return false;
            const leftShoulder = currentPose[11];
            const rightShoulder = currentPose[12];
            if (leftShoulder && rightShoulder) {
                const shoulderDistance = Math.abs(leftShoulder.x - rightShoulder.x);
                return shoulderDistance > 0.15;
            }
            return false;
        };

        return { poseCount, handCount, fingerCount, inRange: isInRange() };
    };

    const stats = getStats();

    return (
        <div className="fixed inset-0 bg-black overflow-hidden">
            {/* Fullscreen Pose Detector - OPTIMIZED */}
            <div className="absolute inset-0 flex items-center justify-center">
                <PoseDetector
                    onPoseDetected={handlePoseDetected}
                    onHandsDetected={handleHandsDetected}
                    onPersonDetected={handlePersonDetected}
                    showVideo={true}
                    width={Math.min(1280, viewportSize.width)} // Cap max width
                    height={Math.min(720, viewportSize.height)} // Cap max height
                    className="w-full h-full"
                />
            </div>

            {/* UI Overlays */}

            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 z-20 p-4">
                <div className="flex items-center justify-between">
                    {/* Title */}
                    <div className="bg-black bg-opacity-60 backdrop-blur-sm rounded-lg px-4 py-2">
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                            🎯 AI Pose Tracker
                        </h1>
                    </div>

                    {/* Performance Info */}
                    <div className="bg-black bg-opacity-60 backdrop-blur-sm rounded-lg px-4 py-2">
                        <p className="text-white text-sm">
                            <span className="text-green-400">●</span> {fpsCounter} FPS
                        </p>
                    </div>
                </div>
            </div>

            {/* Performance Optimization Panel - Top Right */}
            <div className="absolute top-20 right-4 z-20">
                <div className="bg-black bg-opacity-70 backdrop-blur-sm rounded-lg p-4 min-w-48">
                    <h3 className="text-white font-bold mb-3 text-center">📊 Live Detection</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-300">Person:</span>
                            <span className={personDetected ? 'text-green-400' : 'text-red-400'}>
                                {personDetected ? '✅ Detected' : '❌ None'}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-300">In Range:</span>
                            <span className={stats.inRange ? 'text-green-400' : 'text-orange-400'}>
                                {stats.inRange ? '✅ Yes' : '⚠️ No'}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-300">Pose Points:</span>
                            <span className="text-blue-400">{stats.poseCount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-300">Hands:</span>
                            <span className="text-yellow-400">{stats.handCount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-300">Fingers:</span>
                            <span className="text-purple-400">{stats.fingerCount}</span>
                        </div>
                    </div>

                    {/* Performance Tips */}
                    {fpsCounter < 10 && (
                        <div className="mt-3 pt-3 border-t border-red-600">
                            <p className="text-red-400 text-xs font-bold mb-1">Performance Tips:</p>
                            <ul className="text-red-300 text-xs space-y-1">
                                <li>• Close other browser tabs</li>
                                <li>• Use Chrome/Edge browser</li>
                                <li>• Enable hardware acceleration</li>
                                <li>• Reduce browser window size</li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* Detection Logs - Left Side (Simplified) */}
            <div className="absolute top-20 left-4 z-20">
                <div className="bg-black bg-opacity-70 backdrop-blur-sm rounded-lg p-4 w-72">
                    <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                        📝 Activity Log
                        <button
                            onClick={() => setDetectionLogs([])}
                            className="text-xs text-gray-400 hover:text-white ml-auto"
                        >
                            Clear
                        </button>
                    </h3>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                        {detectionLogs.length === 0 ? (
                            <p className="text-gray-400 text-sm italic">Monitoring detection...</p>
                        ) : (
                            detectionLogs.map((log, index) => (
                                <div
                                    key={index}
                                    className={`text-xs p-1 rounded ${index === 0 ? 'bg-blue-900 bg-opacity-30 text-blue-200' : 'text-gray-300'
                                        }`}
                                    style={{ opacity: 1 - (index * 0.2) }}
                                >
                                    {log.split('] ')[1]} {/* Remove timestamp for cleaner look */}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Controls - Bottom Center (with performance warning) */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
                <div className="bg-black bg-opacity-70 backdrop-blur-sm rounded-2xl p-3">
                    <div className="flex gap-3 items-center text-sm">
                        <div className="text-white">
                            <span className="text-gray-400">MediaPipe:</span> Pose + Hands
                        </div>
                        <div className="text-white">
                            <span className="text-gray-400">Resolution:</span> {Math.min(1280, viewportSize.width)}x{Math.min(720, viewportSize.height)}
                        </div>
                        <div className={`text-sm font-bold ${fpsCounter > 15 ? 'text-green-400' : fpsCounter > 10 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {fpsCounter} FPS
                        </div>
                        {fpsCounter < 10 && (
                            <div className="text-red-400 text-xs bg-red-900 bg-opacity-50 px-2 py-1 rounded">
                                ⚠️ Low Performance
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Status Indicators - Bottom Right */}
            <div className="absolute bottom-8 right-4 z-20">
                <div className="bg-black bg-opacity-70 backdrop-blur-sm rounded-lg p-3">
                    <div className="grid grid-cols-4 gap-3 text-center">
                        <div>
                            <div className={`text-2xl mb-1 ${personDetected ? 'text-green-400' : 'text-red-400'}`}>
                                {personDetected ? '👤' : '❌'}
                            </div>
                            <p className="text-white text-xs font-medium">Person</p>
                        </div>

                        <div>
                            <div className={`text-2xl mb-1 ${stats.inRange ? 'text-green-400' : 'text-orange-400'}`}>
                                {stats.inRange ? '🎯' : '📏'}
                            </div>
                            <p className="text-white text-xs font-medium">Range</p>
                        </div>

                        <div>
                            <div className={`text-2xl mb-1 ${stats.poseCount > 0 ? 'text-blue-400' : 'text-gray-400'}`}>
                                🦴
                            </div>
                            <p className="text-white text-xs font-medium">Pose</p>
                        </div>

                        <div>
                            <div className={`text-2xl mb-1 ${stats.handCount > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                                ✋
                            </div>
                            <p className="text-white text-xs font-medium">Hands</p>
                        </div>
                    </div>

                    {/* Detailed hand info when hands detected */}
                    {stats.handCount > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-600">
                            <div className="text-center">
                                <div className="text-purple-400 text-lg font-bold">{stats.fingerCount}</div>
                                <p className="text-gray-300 text-xs">Fingertips</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Instructions - Bottom Left */}
            <div className="absolute bottom-8 left-4 z-20">
                <div className="bg-black bg-opacity-60 backdrop-blur-sm rounded-lg p-4 max-w-xs">
                    <h4 className="text-white font-bold mb-2">🎯 Instructions:</h4>
                    <ul className="text-gray-300 text-sm space-y-1">
                        <li>• Stand in front of camera</li>
                        <li>• Move around to test pose detection</li>
                        <li>• Show hands for hand/finger tracking</li>
                        <li>• Make gestures to see fingertip detection</li>
                        <li>• Watch the live detection logs</li>
                    </ul>
                    <div className="mt-3 pt-2 border-t border-gray-600">
                        <p className="text-green-400 text-xs font-medium">
                            ⚡ MediaPipe Pose + Hands
                        </p>
                        <p className="text-gray-400 text-xs">
                            Tracks 33 pose + 21 hand landmarks per hand
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FullscreenPoseTracker;