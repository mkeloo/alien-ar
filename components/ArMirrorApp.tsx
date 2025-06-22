'use client';

import { useRef, useState } from 'react';
import PoseDetector from './PoseDetector';
import AvatarScene, { AvatarSceneRef } from './AvatarScene';

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

const ARMirrorApp: React.FC = () => {
    const avatarRef = useRef<AvatarSceneRef>(null);
    const [personDetected, setPersonDetected] = useState<boolean>(false);
    const [currentPoseData, setCurrentPoseData] = useState<PoseLandmark[] | null>(null);
    const [currentHandsData, setCurrentHandsData] = useState<HandLandmark[][] | null>(null);

    // Handle pose detection updates
    const handlePoseDetected = (poseData: PoseLandmark[]) => {
        setCurrentPoseData(poseData);
        // Update the 3D avatar with new pose data
        avatarRef.current?.updatePose(poseData);
    };

    // Handle hands detection updates
    const handleHandsDetected = (handsData: HandLandmark[][]) => {
        setCurrentHandsData(handsData);
        // Update the 3D avatar with new hands data
        avatarRef.current?.updateHands(handsData);
    };

    // Handle person detection status
    const handlePersonDetected = (detected: boolean) => {
        setPersonDetected(detected);
    };

    // Helper functions for stats
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
        if (!currentHandsData) return 0;

        let totalFingers = 0;
        currentHandsData.forEach(handLandmarks => {
            const fingertips = [4, 8, 12, 16, 20];
            fingertips.forEach(tipIndex => {
                if (handLandmarks[tipIndex]) {
                    totalFingers++;
                }
            });
        });

        return totalFingers;
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
            <h1 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
                🚀 AR Mirror - Pose Detection + 3D Avatar
            </h1>

            {/* Split Screen Layout */}
            <div className="flex gap-8 mb-8">
                {/* Left: Pose Detection */}
                <div className="flex flex-col items-center">
                    <h2 className="text-2xl font-bold mb-4 text-blue-400">📹 Pose Detection</h2>
                    <PoseDetector
                        onPoseDetected={handlePoseDetected}
                        onHandsDetected={handleHandsDetected}
                        onPersonDetected={handlePersonDetected}
                        showVideo={true}
                        width={640}
                        height={480}
                        className=""
                    />
                </div>

                {/* Right: 3D Avatar */}
                <div className="flex flex-col items-center">
                    <h2 className="text-2xl font-bold mb-4 text-green-400">🤖 3D Avatar</h2>
                    <AvatarScene
                        ref={avatarRef}
                        width={640}
                        height={480}
                        className="border-4 border-green-500 rounded-lg shadow-lg"
                    />
                </div>
            </div>

            {/* Enhanced Status Panel */}
            <div className="bg-gray-800 rounded-xl p-6 shadow-2xl border border-gray-700">
                <div className="grid grid-cols-4 gap-6 text-center">
                    <div className="flex flex-col items-center">
                        <div className={`text-3xl mb-2 ${personDetected ? 'text-green-400' : 'text-red-400'}`}>
                            {personDetected ? '✅' : '❌'}
                        </div>
                        <p className="text-sm font-medium text-gray-300">Person Detected</p>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className={`text-3xl mb-2 ${isInRange(currentPoseData) ? 'text-green-400' : 'text-orange-400'}`}>
                            {isInRange(currentPoseData) ? '✅' : '📏'}
                        </div>
                        <p className="text-sm font-medium text-gray-300">In Range</p>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className={`text-3xl mb-2 ${getFingerCount() > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                            🖐️ {getFingerCount()}
                        </div>
                        <p className="text-sm font-medium text-gray-300">Fingers Detected</p>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="text-3xl mb-2 text-purple-400">
                            🎯
                        </div>
                        <p className="text-sm font-medium text-gray-300">Avatar Active</p>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-600">
                    <div className="grid grid-cols-2 gap-4 text-center text-sm">
                        {currentPoseData && (
                            <div className="bg-gray-700 rounded-lg p-3">
                                <p className="text-blue-400 font-semibold mb-1">Body Tracking</p>
                                <p className="text-gray-300">{currentPoseData.length} pose points</p>
                            </div>
                        )}
                        {currentHandsData && (
                            <div className="bg-gray-700 rounded-lg p-3">
                                <p className="text-yellow-400 font-semibold mb-1">Hand Tracking</p>
                                <p className="text-gray-300">{currentHandsData.length} hand{currentHandsData.length !== 1 ? 's' : ''} detected</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Debug Panel (Optional) */}
            {process.env.NODE_ENV === 'development' && (currentPoseData || currentHandsData) && (
                <div className="mt-6 bg-gray-900 rounded-lg p-4 text-xs max-w-4xl">
                    <h4 className="font-bold mb-3 text-yellow-400">🐛 Debug Info (Dev Mode):</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentPoseData && (
                            <div>
                                <h5 className="text-blue-400 font-semibold mb-2">Body Landmarks:</h5>
                                <div className="space-y-1 text-gray-300">
                                    <div>
                                        <span className="text-gray-400">Nose:</span>{' '}
                                        {currentPoseData[0] ?
                                            `(${currentPoseData[0].x.toFixed(2)}, ${currentPoseData[0].y.toFixed(2)})` :
                                            'Not detected'
                                        }
                                    </div>
                                    <div>
                                        <span className="text-gray-400">L.Shoulder:</span>{' '}
                                        {currentPoseData[11] ?
                                            `(${currentPoseData[11].x.toFixed(2)}, ${currentPoseData[11].y.toFixed(2)})` :
                                            'Not detected'
                                        }
                                    </div>
                                    <div>
                                        <span className="text-gray-400">R.Shoulder:</span>{' '}
                                        {currentPoseData[12] ?
                                            `(${currentPoseData[12].x.toFixed(2)}, ${currentPoseData[12].y.toFixed(2)})` :
                                            'Not detected'
                                        }
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentHandsData && (
                            <div>
                                <h5 className="text-yellow-400 font-semibold mb-2">Hand Landmarks:</h5>
                                {currentHandsData.map((hand, index) => (
                                    <div key={index} className="mb-2">
                                        <div className="text-gray-300 font-medium">Hand {index + 1}:</div>
                                        <div className="ml-2 space-y-1 text-gray-400">
                                            <div>
                                                <span>Thumb tip:</span>{' '}
                                                {hand[4] ? `(${hand[4].x.toFixed(2)}, ${hand[4].y.toFixed(2)})` : 'N/A'}
                                            </div>
                                            <div>
                                                <span>Index tip:</span>{' '}
                                                {hand[8] ? `(${hand[8].x.toFixed(2)}, ${hand[8].y.toFixed(2)})` : 'N/A'}
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

export default ARMirrorApp;