"use client";
import { useEffect, useRef, useState } from 'react';

interface PoseLandmark {
    x: number;
    y: number;
    z: number;
    visibility?: number;
}

interface PoseResults {
    poseLandmarks: PoseLandmark[];
    image: HTMLVideoElement;
}

const PoseDetector: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [personDetected, setPersonDetected] = useState<boolean>(false);
    const [poseData, setPoseData] = useState<PoseLandmark[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let pose: any = null;
        let camera: any = null;

        const initializePoseDetection = async () => {
            try {
                // Import MediaPipe modules
                const { Pose } = await import('@mediapipe/pose');
                const { Camera } = await import('@mediapipe/camera_utils');
                const { drawConnectors, drawLandmarks } = await import('@mediapipe/drawing_utils');
                const { POSE_CONNECTIONS } = await import('@mediapipe/pose');

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

                // Handle pose results
                pose.onResults((results: PoseResults) => {
                    const canvas = canvasRef.current;
                    if (!canvas) return;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;

                    // Clear canvas
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    // Draw video frame
                    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

                    if (results.poseLandmarks && results.poseLandmarks.length > 0) {
                        setPersonDetected(true);
                        setPoseData(results.poseLandmarks);

                        // Draw pose landmarks and connections
                        drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
                            color: '#00FF00',
                            lineWidth: 4
                        });
                        drawLandmarks(ctx, results.poseLandmarks, {
                            color: '#FF0000',
                            lineWidth: 2,
                            radius: 6
                        });
                    } else {
                        setPersonDetected(false);
                        setPoseData(null);
                    }
                });

                // Initialize camera
                if (videoRef.current) {
                    camera = new Camera(videoRef.current, {
                        onFrame: async () => {
                            if (pose && videoRef.current) {
                                await pose.send({ image: videoRef.current });
                            }
                        },
                        width: 640,
                        height: 480
                    });

                    await camera.start();
                    setIsLoading(false);
                }

            } catch (error) {
                console.error('Error initializing pose detection:', error);
                setError('Failed to initialize camera or pose detection');
                setIsLoading(false);
            }
        };

        initializePoseDetection();

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

        // Check if person is close enough (based on shoulder width)
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];

        if (leftShoulder && rightShoulder) {
            const shoulderDistance = Math.abs(leftShoulder.x - rightShoulder.x);
            return shoulderDistance > 0.15; // Adjust threshold as needed
        }
        return false;
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
                🚀 AR Mirror - Pose Detection
            </h1>

            {isLoading && (
                <div className="flex flex-col items-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                    <p className="text-lg">Loading pose detection...</p>
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
                    style={{ transform: 'scaleX(-1)' }} // Mirror effect
                />
            </div>

            {/* Status Panel */}
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
                <div className="grid grid-cols-2 gap-4 text-center">
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
                </div>

                {poseData && (
                    <div className="mt-4 pt-4 border-t border-gray-600">
                        <p className="text-center text-sm text-gray-300">
                            Tracking {poseData.length} pose points
                        </p>
                    </div>
                )}
            </div>

            {/* Debug Panel */}
            {poseData && (
                <div className="mt-6 bg-gray-900 rounded-lg p-4 text-xs">
                    <h4 className="font-bold mb-2 text-yellow-400">Debug Info:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                            <span className="text-gray-400">Nose:</span>{' '}
                            {poseData[0] ?
                                `${poseData[0].x.toFixed(2)}, ${poseData[0].y.toFixed(2)}` :
                                'Not detected'
                            }
                        </div>
                        <div>
                            <span className="text-gray-400">L.Wrist:</span>{' '}
                            {poseData[15] ?
                                `${poseData[15].x.toFixed(2)}, ${poseData[15].y.toFixed(2)}` :
                                'Not detected'
                            }
                        </div>
                        <div>
                            <span className="text-gray-400">R.Wrist:</span>{' '}
                            {poseData[16] ?
                                `${poseData[16].x.toFixed(2)}, ${poseData[16].y.toFixed(2)}` :
                                'Not detected'
                            }
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PoseDetector;