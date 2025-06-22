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

const PoseDetector: React.FC = () => {
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

        const drawResults = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw video frame (use the most recent frame)
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

        const drawPose = async (ctx: CanvasRenderingContext2D, landmarks: PoseLandmark[]) => {
            const { drawConnectors, drawLandmarks } = await import('@mediapipe/drawing_utils');
            const { POSE_CONNECTIONS } = await import('@mediapipe/pose');

            // Filter out arm connections to avoid overlap with hand detection
            const bodyConnections = POSE_CONNECTIONS.filter(connection => {
                const [start, end] = connection;
                // Exclude arm connections (wrist to elbow, elbow to shoulder for hands)
                // Keep: shoulders, torso, hips, legs, face
                const armPoints = [15, 16, 17, 18, 19, 20, 21, 22]; // wrist and hand points
                return !armPoints.includes(start) && !armPoints.includes(end);
            });

            // Draw body connections (excluding arms)
            drawConnectors(ctx, landmarks, bodyConnections, {
                color: '#00FF00',
                lineWidth: 4
            });

            // Draw all landmarks except hand/wrist points
            const bodyLandmarks = landmarks.filter((_, index) => {
                const handWristPoints = [15, 16, 17, 18, 19, 20, 21, 22]; // exclude wrist and hand points
                return !handWristPoints.includes(index);
            });

            drawLandmarks(ctx, bodyLandmarks, {
                color: '#FF0000',
                lineWidth: 2,
                radius: 6
            });

            // Draw shoulder and elbow landmarks in a different color to show arm structure
            const armJoints = [11, 12, 13, 14]; // left/right shoulder and elbow
            const armLandmarksToShow = landmarks.filter((_, index) => armJoints.includes(index));

            drawLandmarks(ctx, armLandmarksToShow, {
                color: '#00FFFF', // Cyan for arm joints
                lineWidth: 2,
                radius: 8
            });
        };

        const drawHands = async (ctx: CanvasRenderingContext2D, handsLandmarks: HandLandmark[][]) => {
            const { drawConnectors, drawLandmarks } = await import('@mediapipe/drawing_utils');
            const { HAND_CONNECTIONS } = await import('@mediapipe/hands');

            const canvas = canvasRef.current;
            if (!canvas) return;

            for (const landmarks of handsLandmarks) {
                // Draw hand connections in blue
                drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
                    color: '#00CCFF',
                    lineWidth: 3
                });

                // Draw hand landmarks in yellow
                drawLandmarks(ctx, landmarks, {
                    color: '#FFFF00',
                    lineWidth: 2,
                    radius: 4
                });

                // Highlight fingertips in bright colors
                const fingertips = [4, 8, 12, 16, 20]; // Thumb, Index, Middle, Ring, Pinky tips
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
        };

        const initializeDetection = async () => {
            try {
                // Import MediaPipe modules
                const { Pose } = await import('@mediapipe/pose');
                const { Hands } = await import('@mediapipe/hands');
                const { Camera } = await import('@mediapipe/camera_utils');

                // Initialize pose detection
                pose = new Pose({
                    locateFile: (file: string) => {
                        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
                    }
                });

                pose.setOptions({
                    modelComplexity: 1,
                    smoothLandmarks: true,
                    enableSegmentation: false,
                    smoothSegmentation: true,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });

                // Initialize hands detection
                hands = new Hands({
                    locateFile: (file: string) => {
                        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                    }
                });

                hands.setOptions({
                    maxNumHands: 2,
                    modelComplexity: 1,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });

                // Handle pose results
                pose.onResults((results: PoseResults) => {
                    lastPoseResults = results;

                    if (results.poseLandmarks && results.poseLandmarks.length > 0) {
                        setPersonDetected(true);
                        setPoseData(results.poseLandmarks);
                    } else {
                        setPersonDetected(false);
                        setPoseData(null);
                    }

                    drawResults();
                });

                // Handle hands results
                hands.onResults((results: HandResults) => {
                    lastHandResults = results;

                    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                        setHandsData(results.multiHandLandmarks);
                    } else {
                        setHandsData(null);
                    }

                    drawResults();
                });

                // Initialize camera
                if (videoRef.current) {
                    camera = new Camera(videoRef.current, {
                        onFrame: async () => {
                            if (videoRef.current) {
                                // Send frame to both pose and hands detection
                                if (pose) {
                                    await pose.send({ image: videoRef.current });
                                }
                                if (hands) {
                                    await hands.send({ image: videoRef.current });
                                }
                            }
                        },
                        width: 640,
                        height: 480
                    });

                    await camera.start();
                    setIsLoading(false);
                }

            } catch (error) {
                console.error('Error initializing detection:', error);
                setError('Failed to initialize camera or detection systems');
                setIsLoading(false);
            }
        };

        initializeDetection();

        // Cleanup
        return () => {
            if (camera) {
                camera.stop();
            }
        };
    }, []);

    // Function to check if person is in interaction range
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

    // Count detected fingers
    const getFingerCount = (): number => {
        if (!handsData) return 0;

        let totalFingers = 0;

        handsData.forEach(handLandmarks => {
            // Check each finger tip visibility/confidence
            const fingertips = [4, 8, 12, 16, 20]; // Thumb, Index, Middle, Ring, Pinky
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
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <p className="font-bold">Error:</p>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
            <h1 className="text-3xl font-bold mb-6 text-center">
                🚀 AR Mirror - Full Body & Hand Tracking
            </h1>

            {isLoading && (
                <div className="flex flex-col items-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                    <p className="text-lg">Loading detection systems...</p>
                    <p className="text-sm text-gray-400">Please allow camera access</p>
                </div>
            )}

            <div className="relative mb-6">
                <video
                    ref={videoRef}
                    className="hidden"
                    width="640"
                    height="480"
                />
                <canvas
                    ref={canvasRef}
                    width="640"
                    height="480"
                    className="border-4 border-blue-500 rounded-lg shadow-lg"
                    style={{ transform: 'scaleX(-1)' }}
                />
            </div>

            {/* Enhanced Status Panel */}
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="flex flex-col items-center">
                        <div className={`text-2xl mb-2 ${personDetected ? 'text-green-400' : 'text-red-400'}`}>
                            {personDetected ? '✅' : '❌'}
                        </div>
                        <p className="text-sm font-medium">Person Detected</p>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className={`text-2xl mb-2 ${isInRange(poseData) ? 'text-green-400' : 'text-orange-400'}`}>
                            {isInRange(poseData) ? '✅' : '📏'}
                        </div>
                        <p className="text-sm font-medium">In Range</p>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className={`text-2xl mb-2 ${getFingerCount() > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                            🖐️ {getFingerCount()}
                        </div>
                        <p className="text-sm font-medium">Fingers Detected</p>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-600 text-center">
                    {poseData && (
                        <p className="text-sm text-gray-300 mb-1">
                            Body: {poseData.length} pose points
                        </p>
                    )}
                    {handsData && (
                        <p className="text-sm text-gray-300">
                            Hands: {handsData.length} hand{handsData.length !== 1 ? 's' : ''} detected
                        </p>
                    )}
                </div>
            </div>

            {/* Enhanced Debug Panel */}
            {(poseData || handsData) && (
                <div className="mt-6 bg-gray-900 rounded-lg p-4 text-xs">
                    <h4 className="font-bold mb-2 text-yellow-400">Debug Info:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {poseData && (
                            <div>
                                <h5 className="text-blue-400 font-semibold mb-1">Body Tracking:</h5>
                                <div className="space-y-1">
                                    <div>
                                        <span className="text-gray-400">Nose:</span>{' '}
                                        {poseData[0] ? `${poseData[0].x.toFixed(2)}, ${poseData[0].y.toFixed(2)}` : 'Not detected'}
                                    </div>
                                    <div>
                                        <span className="text-gray-400">L.Wrist:</span>{' '}
                                        {poseData[15] ? `${poseData[15].x.toFixed(2)}, ${poseData[15].y.toFixed(2)}` : 'Not detected'}
                                    </div>
                                    <div>
                                        <span className="text-gray-400">R.Wrist:</span>{' '}
                                        {poseData[16] ? `${poseData[16].x.toFixed(2)}, ${poseData[16].y.toFixed(2)}` : 'Not detected'}
                                    </div>
                                </div>
                            </div>
                        )}

                        {handsData && (
                            <div>
                                <h5 className="text-yellow-400 font-semibold mb-1">Hand Tracking:</h5>
                                {handsData.map((hand, index) => (
                                    <div key={index} className="mb-2">
                                        <div className="text-gray-300">Hand {index + 1}:</div>
                                        <div className="ml-2 space-y-1">
                                            <div>
                                                <span className="text-gray-400">Thumb:</span>{' '}
                                                {hand[4] ? `${hand[4].x.toFixed(2)}, ${hand[4].y.toFixed(2)}` : 'N/A'}
                                            </div>
                                            <div>
                                                <span className="text-gray-400">Index:</span>{' '}
                                                {hand[8] ? `${hand[8].x.toFixed(2)}, ${hand[8].y.toFixed(2)}` : 'N/A'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PoseDetector;