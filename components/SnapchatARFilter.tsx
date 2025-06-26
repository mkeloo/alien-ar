'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

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

const SnapchatARFilter: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const effectsCanvasRef = useRef<HTMLCanvasElement>(null);

    const [initStep, setInitStep] = useState<string>('Starting...');
    const [cameraReady, setCameraReady] = useState(false);
    const [personDetected, setPersonDetected] = useState(false);
    const [currentFilter, setCurrentFilter] = useState<string>('cyborg');
    const [poseData, setPoseData] = useState<PoseLandmark[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Available filters
    const filters = [
        { id: 'cyborg', name: '🤖 Cyborg', description: 'Futuristic robot overlay' },
        { id: 'fire', name: '🔥 Fire Avatar', description: 'Burning energy effects' },
        { id: 'neon', name: '⚡ Neon Glow', description: 'Electric neon outline' },
        { id: 'alien', name: '👽 Alien', description: 'Extraterrestrial transformation' },
        { id: 'skeleton', name: '💀 X-Ray', description: 'Skeleton overlay' }
    ];

    // Initialize camera
    useEffect(() => {
        const initCamera = async () => {
            try {
                setInitStep('Requesting camera access...');

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: 1280,
                        height: 720,
                        facingMode: 'user'
                    }
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();

                    videoRef.current.onloadedmetadata = () => {
                        setCameraReady(true);
                        setInitStep('Camera ready!');
                    };
                }

            } catch (err) {
                console.error('Camera error:', err);
                setError(`Camera access failed: ${(err as Error).message}`);
            }
        };

        initCamera();

        return () => {
            if (videoRef.current?.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Draw AR effects based on current filter
    const drawAREffects = useCallback((landmarks: PoseLandmark[]) => {
        const canvas = effectsCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear effects canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        switch (currentFilter) {
            case 'cyborg':
                drawCyborgFilter(ctx, landmarks, canvas);
                break;
            case 'fire':
                drawFireFilter(ctx, landmarks, canvas);
                break;
            case 'neon':
                drawNeonFilter(ctx, landmarks, canvas);
                break;
            case 'alien':
                drawAlienFilter(ctx, landmarks, canvas);
                break;
            case 'skeleton':
                drawSkeletonFilter(ctx, landmarks, canvas);
                break;
        }
    }, [currentFilter]);

    // Cyborg filter - tech overlay
    const drawCyborgFilter = (ctx: CanvasRenderingContext2D, landmarks: PoseLandmark[], canvas: HTMLCanvasElement) => {
        const time = Date.now() * 0.01;

        // Glowing eyes
        if (landmarks[1] && landmarks[2]) { // Left and right eye inner corners
            const leftEye = { x: landmarks[1].x * canvas.width, y: landmarks[1].y * canvas.height };
            const rightEye = { x: landmarks[2].x * canvas.width, y: landmarks[2].y * canvas.height };

            // Pulsing red glow
            const glowIntensity = 0.5 + 0.5 * Math.sin(time * 2);

            [leftEye, rightEye].forEach(eye => {
                const gradient = ctx.createRadialGradient(eye.x, eye.y, 0, eye.x, eye.y, 30);
                gradient.addColorStop(0, `rgba(255, 0, 0, ${glowIntensity})`);
                gradient.addColorStop(0.5, `rgba(255, 100, 0, ${glowIntensity * 0.5})`);
                gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(eye.x, eye.y, 30, 0, 2 * Math.PI);
                ctx.fill();

                // Center dot
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(eye.x, eye.y, 3, 0, 2 * Math.PI);
                ctx.fill();
            });
        }

        // Tech HUD overlay on face
        if (landmarks[0]) { // Nose
            const nose = { x: landmarks[0].x * canvas.width, y: landmarks[0].y * canvas.height };

            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);

            // Target reticle
            ctx.beginPath();
            ctx.arc(nose.x, nose.y, 50, 0, 2 * Math.PI);
            ctx.stroke();

            // Crosshairs
            ctx.beginPath();
            ctx.moveTo(nose.x - 70, nose.y);
            ctx.lineTo(nose.x + 70, nose.y);
            ctx.moveTo(nose.x, nose.y - 70);
            ctx.lineTo(nose.x, nose.y + 70);
            ctx.stroke();

            ctx.setLineDash([]);
        }

        // Chest reactor (arc reactor style)
        if (landmarks[11] && landmarks[12]) { // Shoulders
            const centerX = (landmarks[11].x + landmarks[12].x) / 2 * canvas.width;
            const centerY = ((landmarks[11].y + landmarks[12].y) / 2 + 0.1) * canvas.height;

            const reactorGlow = 0.7 + 0.3 * Math.sin(time * 3);

            // Outer glow
            const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 60);
            gradient.addColorStop(0, `rgba(0, 150, 255, ${reactorGlow})`);
            gradient.addColorStop(0.7, `rgba(0, 100, 255, ${reactorGlow * 0.3})`);
            gradient.addColorStop(1, 'rgba(0, 150, 255, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 60, 0, 2 * Math.PI);
            ctx.fill();

            // Inner core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
            ctx.fill();

            // Ring details
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2 + time * 0.5;
                const x = centerX + Math.cos(angle) * 25;
                const y = centerY + Math.sin(angle) * 25;

                ctx.fillStyle = '#00aaff';
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, 2 * Math.PI);
                ctx.fill();
            }
        }

        // Arm enhancement lines
        if (landmarks[11] && landmarks[13] && landmarks[15]) { // Left arm
            drawTechLines(ctx, [
                { x: landmarks[11].x * canvas.width, y: landmarks[11].y * canvas.height },
                { x: landmarks[13].x * canvas.width, y: landmarks[13].y * canvas.height },
                { x: landmarks[15].x * canvas.width, y: landmarks[15].y * canvas.height }
            ], '#00ff00');
        }

        if (landmarks[12] && landmarks[14] && landmarks[16]) { // Right arm
            drawTechLines(ctx, [
                { x: landmarks[12].x * canvas.width, y: landmarks[12].y * canvas.height },
                { x: landmarks[14].x * canvas.width, y: landmarks[14].y * canvas.height },
                { x: landmarks[16].x * canvas.width, y: landmarks[16].y * canvas.height }
            ], '#00ff00');
        }
    };

    // Fire filter - burning energy effects
    const drawFireFilter = (ctx: CanvasRenderingContext2D, landmarks: PoseLandmark[], canvas: HTMLCanvasElement) => {
        const time = Date.now() * 0.005;

        // Fire outline around body
        const bodyPoints = [0, 11, 12, 23, 24, 25, 26, 27, 28].map(i => landmarks[i]).filter(Boolean);

        if (bodyPoints.length > 0) {
            ctx.strokeStyle = '#ff4500';
            ctx.lineWidth = 8;
            ctx.shadowColor = '#ff6600';
            ctx.shadowBlur = 20;

            bodyPoints.forEach((point, i) => {
                if (i > 0) {
                    const x1 = bodyPoints[i - 1].x * canvas.width;
                    const y1 = bodyPoints[i - 1].y * canvas.height;
                    const x2 = point.x * canvas.width;
                    const y2 = point.y * canvas.height;

                    // Add flame flicker
                    const flicker = Math.sin(time + i) * 10;

                    ctx.beginPath();
                    ctx.moveTo(x1 + flicker, y1);
                    ctx.lineTo(x2 + flicker, y2);
                    ctx.stroke();
                }
            });

            ctx.shadowBlur = 0;
        }

        // Flaming eyes
        if (landmarks[1] && landmarks[2]) {
            [landmarks[1], landmarks[2]].forEach((eye, i) => {
                const x = eye.x * canvas.width;
                const y = eye.y * canvas.height;

                // Animated flame particles
                for (let p = 0; p < 5; p++) {
                    const particleTime = time + i + p * 0.5;
                    const px = x + Math.sin(particleTime) * 15;
                    const py = y - Math.abs(Math.sin(particleTime * 2)) * 20;

                    const gradient = ctx.createRadialGradient(px, py, 0, px, py, 10);
                    gradient.addColorStop(0, '#ffff00');
                    gradient.addColorStop(0.5, '#ff6600');
                    gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(px, py, 8, 0, 2 * Math.PI);
                    ctx.fill();
                }
            });
        }
    };

    // Neon filter - electric glow outline
    const drawNeonFilter = (ctx: CanvasRenderingContext2D, landmarks: PoseLandmark[], canvas: HTMLCanvasElement) => {
        const time = Date.now() * 0.01;

        // Get all available landmarks for full body outline
        const availablePoints = landmarks.filter(point => point && point.visibility && point.visibility > 0.5);

        if (availablePoints.length > 0) {
            const glowIntensity = 0.8 + 0.2 * Math.sin(time * 2);

            // Electric blue glow
            ctx.strokeStyle = `rgba(0, 255, 255, ${glowIntensity})`;
            ctx.lineWidth = 6;
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 15;

            // Draw connected outline
            const connections = [
                [0, 1], [1, 2], [2, 3], [3, 7], // Face
                [0, 4], [4, 5], [5, 6], [6, 8], // Face
                [9, 10], // Mouth
                [11, 12], // Shoulders
                [11, 13], [13, 15], // Left arm
                [12, 14], [14, 16], // Right arm
                [11, 23], [12, 24], // Torso
                [23, 24], // Hips
                [23, 25], [25, 27], // Left leg
                [24, 26], [26, 28], // Right leg
            ];

            connections.forEach(([start, end]) => {
                if (landmarks[start] && landmarks[end]) {
                    const x1 = landmarks[start].x * canvas.width;
                    const y1 = landmarks[start].y * canvas.height;
                    const x2 = landmarks[end].x * canvas.width;
                    const y2 = landmarks[end].y * canvas.height;

                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }
            });

            // Electric sparks at joints
            [0, 11, 12, 13, 14, 15, 16, 23, 24].forEach(i => {
                if (landmarks[i]) {
                    const x = landmarks[i].x * canvas.width;
                    const y = landmarks[i].y * canvas.height;

                    // Random spark effect
                    if (Math.random() > 0.7) {
                        const sparkSize = 5 + Math.random() * 10;
                        ctx.fillStyle = '#ffffff';
                        ctx.beginPath();
                        ctx.arc(x, y, sparkSize, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                }
            });

            ctx.shadowBlur = 0;
        }
    };

    // Alien filter - extraterrestrial transformation
    const drawAlienFilter = (ctx: CanvasRenderingContext2D, landmarks: PoseLandmark[], canvas: HTMLCanvasElement) => {
        const time = Date.now() * 0.003;

        // Large alien eyes
        if (landmarks[1] && landmarks[2]) {
            [landmarks[1], landmarks[2]].forEach(eye => {
                const x = eye.x * canvas.width;
                const y = eye.y * canvas.height;

                // Large black alien eye
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, 40);
                gradient.addColorStop(0, '#000000');
                gradient.addColorStop(0.7, '#001100');
                gradient.addColorStop(1, 'rgba(0, 50, 0, 0.5)');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(x, y, 40, 0, 2 * Math.PI);
                ctx.fill();

                // Glowing pupil
                const pupilGlow = 0.5 + 0.5 * Math.sin(time * 4);
                ctx.fillStyle = `rgba(0, 255, 0, ${pupilGlow})`;
                ctx.beginPath();
                ctx.arc(x, y, 8, 0, 2 * Math.PI);
                ctx.fill();
            });
        }

        // Green skin tint overlay
        if (landmarks[0]) { // Face area
            const nose = landmarks[0];
            const x = nose.x * canvas.width;
            const y = nose.y * canvas.height;

            const gradient = ctx.createRadialGradient(x, y, 0, x, y, 150);
            gradient.addColorStop(0, 'rgba(0, 255, 0, 0.2)');
            gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, 150, 0, 2 * Math.PI);
            ctx.fill();
        }

        // Pulsating aura
        if (landmarks[11] && landmarks[12]) {
            const centerX = (landmarks[11].x + landmarks[12].x) / 2 * canvas.width;
            const centerY = (landmarks[11].y + landmarks[12].y) / 2 * canvas.height;

            const auraSize = 200 + 50 * Math.sin(time * 2);
            const auraIntensity = 0.1 + 0.05 * Math.sin(time * 3);

            const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, auraSize);
            gradient.addColorStop(0, `rgba(150, 255, 150, ${auraIntensity})`);
            gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, auraSize, 0, 2 * Math.PI);
            ctx.fill();
        }
    };

    // Skeleton filter - X-ray effect
    const drawSkeletonFilter = (ctx: CanvasRenderingContext2D, landmarks: PoseLandmark[], canvas: HTMLCanvasElement) => {
        // White skeleton on dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;

        // Skeleton connections
        const connections = [
            [11, 12], // Shoulders
            [11, 13], [13, 15], // Left arm
            [12, 14], [14, 16], // Right arm
            [11, 23], [12, 24], // Spine
            [23, 24], // Pelvis
            [23, 25], [25, 27], // Left leg
            [24, 26], [26, 28], // Right leg
        ];

        connections.forEach(([start, end]) => {
            if (landmarks[start] && landmarks[end]) {
                const x1 = landmarks[start].x * canvas.width;
                const y1 = landmarks[start].y * canvas.height;
                const x2 = landmarks[end].x * canvas.width;
                const y2 = landmarks[end].y * canvas.height;

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        });

        // Skull
        if (landmarks[0]) {
            const x = landmarks[0].x * canvas.width;
            const y = landmarks[0].y * canvas.height;

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x, y - 30, 60, 0, 2 * Math.PI);
            ctx.fill();

            // Eye sockets
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(x - 20, y - 40, 15, 0, 2 * Math.PI);
            ctx.arc(x + 20, y - 40, 15, 0, 2 * Math.PI);
            ctx.fill();
        }

        // Joints as circles
        [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].forEach(i => {
            if (landmarks[i]) {
                const x = landmarks[i].x * canvas.width;
                const y = landmarks[i].y * canvas.height;

                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(x, y, 8, 0, 2 * Math.PI);
                ctx.fill();
            }
        });
    };

    // Helper function for tech lines
    const drawTechLines = (ctx: CanvasRenderingContext2D, points: Array<{ x: number, y: number }>, color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);

        for (let i = 1; i < points.length; i++) {
            ctx.beginPath();
            ctx.moveTo(points[i - 1].x, points[i - 1].y);
            ctx.lineTo(points[i].x, points[i].y);
            ctx.stroke();
        }

        ctx.setLineDash([]);
    };

    // Initialize pose detection
    useEffect(() => {
        if (!cameraReady || !videoRef.current) return;

        let pose: any = null;
        let isComponentMounted = true;

        const initializePoseDetection = async () => {
            try {
                setInitStep('Loading AR filters...');

                const { Pose } = await import('@mediapipe/pose');

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
                    minDetectionConfidence: 0.7,
                    minTrackingConfidence: 0.5
                });

                pose.onResults((results: PoseResults) => {
                    if (!isComponentMounted) return;

                    // Draw video frame
                    const canvas = canvasRef.current;
                    const ctx = canvas?.getContext('2d');

                    if (canvas && ctx && videoRef.current) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);

                        // Mirror the video
                        ctx.save();
                        ctx.scale(-1, 1);
                        ctx.drawImage(videoRef.current, -canvas.width, 0, canvas.width, canvas.height);
                        ctx.restore();
                    }

                    if (results.poseLandmarks && results.poseLandmarks.length > 0) {
                        setPersonDetected(true);
                        setPoseData(results.poseLandmarks);

                        // Apply AR effects
                        drawAREffects(results.poseLandmarks);
                    } else {
                        setPersonDetected(false);
                        setPoseData(null);

                        // Clear effects when no person
                        const effectsCanvas = effectsCanvasRef.current;
                        if (effectsCanvas) {
                            const effectsCtx = effectsCanvas.getContext('2d');
                            effectsCtx?.clearRect(0, 0, effectsCanvas.width, effectsCanvas.height);
                        }
                    }
                });

                const sendFrame = async () => {
                    if (!isComponentMounted || !videoRef.current || !pose) return;

                    try {
                        await pose.send({ image: videoRef.current });
                    } catch (e) {
                        // Ignore frame errors
                    }

                    setTimeout(sendFrame, 16); // ~60 FPS
                };

                sendFrame();
                setInitStep('AR filters ready!');

            } catch (error) {
                console.error('Pose detection error:', error);
                setError(`AR filters failed: ${(error as Error).message}`);
            }
        };

        initializePoseDetection();

        return () => {
            isComponentMounted = false;

            if (pose) {
                setTimeout(() => {
                    try {
                        pose.close();
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                }, 100);
            }
        };
    }, [cameraReady, drawAREffects]);

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black text-white">
                <div className="bg-red-900 border border-red-500 p-6 rounded-lg max-w-md">
                    <p className="font-bold text-red-200 mb-2">Error:</p>
                    <p className="text-red-300 text-sm">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 bg-red-700 hover:bg-red-600 px-4 py-2 rounded text-white"
                    >
                        Reload Page
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
            <h1 className="text-4xl font-bold mb-6 text-center bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                ✨ AR Mirror Filters
            </h1>

            <div className="mb-6 bg-gray-800 rounded-lg p-4">
                <p className="text-center text-lg">
                    <span className="text-blue-400">Status:</span> {initStep}
                </p>
            </div>

            {/* Filter Selection */}
            <div className="mb-6 flex flex-wrap gap-2 justify-center">
                {filters.map(filter => (
                    <button
                        key={filter.id}
                        onClick={() => setCurrentFilter(filter.id)}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${currentFilter === filter.id
                                ? 'bg-purple-600 text-white scale-105'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                    >
                        {filter.name}
                    </button>
                ))}
            </div>

            {/* AR Camera View */}
            <div className="relative mb-6">
                <video
                    ref={videoRef}
                    className="hidden"
                    width="1280"
                    height="720"
                    autoPlay
                    muted
                    playsInline
                />

                {/* Base video layer */}
                <canvas
                    ref={canvasRef}
                    width="1280"
                    height="720"
                    className="border-4 border-purple-500 rounded-lg shadow-2xl"
                    style={{ width: '640px', height: '360px' }}
                />

                {/* AR effects overlay */}
                <canvas
                    ref={effectsCanvasRef}
                    width="1280"
                    height="720"
                    className="absolute top-0 left-0 pointer-events-none"
                    style={{ width: '640px', height: '360px' }}
                />

                {/* Filter name overlay */}
                <div className="absolute top-4 left-4 bg-black bg-opacity-50 px-3 py-1 rounded">
                    <p className="text-white font-bold">
                        {filters.find(f => f.id === currentFilter)?.name}
                    </p>
                </div>
            </div>

            {/* Status Panel */}
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="flex flex-col items-center">
                        <div className={`text-2xl mb-2 ${cameraReady ? 'text-green-400' : 'text-yellow-400'}`}>
                            {cameraReady ? '📸' : '⏳'}
                        </div>
                        <p className="text-sm font-medium">Camera Ready</p>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className={`text-2xl mb-2 ${personDetected ? 'text-green-400' : 'text-red-400'}`}>
                            {personDetected ? '✨' : '❌'}
                        </div>
                        <p className="text-sm font-medium">AR Filter Active</p>
                    </div>
                </div>
            </div>

            <div className="mt-4 text-center text-gray-400 text-sm max-w-md">
                <p>Move around to see the AR effects! Try different poses and gestures.</p>
            </div>
        </div>
    );
};

export default SnapchatARFilter;