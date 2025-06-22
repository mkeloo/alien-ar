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
    width = 640,
    height = 480,
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

export default PoseDetector;