'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface PoseLandmark {
    x: number;
    y: number;
    z: number;
    visibility?: number;
}

const SimpleAvatarTest: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const avatarRef = useRef<THREE.Group | null>(null);
    const animationIdRef = useRef<number | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        try {
            // Create scene
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0x222222);
            sceneRef.current = scene;

            // Create camera
            const camera = new THREE.PerspectiveCamera(
                75,
                640 / 480,
                0.1,
                1000
            );
            camera.position.set(0, 1.6, 3);
            camera.lookAt(0, 1.6, 0);
            cameraRef.current = camera;

            // Create renderer
            const renderer = new THREE.WebGLRenderer({
                antialias: false, // Reduce memory usage
                powerPreference: "default" // Don't force high-performance GPU
            });
            renderer.setSize(640, 480);
            renderer.shadowMap.enabled = false; // Disable shadows for performance
            containerRef.current.appendChild(renderer.domElement);
            rendererRef.current = renderer;

            // Add basic lighting
            const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
            directionalLight.position.set(2, 5, 2);
            scene.add(directionalLight);

            // Create simple avatar
            const avatar = createSimpleAvatar();
            scene.add(avatar);
            avatarRef.current = avatar;

            // Simple animation loop
            const animate = () => {
                if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

                animationIdRef.current = requestAnimationFrame(animate);

                // Simple rotation for testing
                if (avatarRef.current) {
                    avatarRef.current.rotation.y += 0.01;
                }

                rendererRef.current.render(sceneRef.current, cameraRef.current);
            };

            // Start animation
            animate();
            setIsReady(true);

        } catch (err) {
            console.error('Error initializing 3D scene:', err);
            setError('Failed to initialize 3D avatar');
        }

        // Cleanup
        return () => {
            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
            }

            if (containerRef.current && rendererRef.current?.domElement) {
                containerRef.current.removeChild(rendererRef.current.domElement);
            }

            if (rendererRef.current) {
                rendererRef.current.dispose();
            }

            if (sceneRef.current) {
                sceneRef.current.clear();
            }
        };
    }, []);

    const createSimpleAvatar = (): THREE.Group => {
        const group = new THREE.Group();

        // Simple green material
        const material = new THREE.MeshLambertMaterial({ color: 0x00ff88 });

        // Head
        const headGeometry = new THREE.SphereGeometry(0.2, 12, 12);
        const head = new THREE.Mesh(headGeometry, material);
        head.position.set(0, 1.8, 0);
        group.add(head);

        // Body
        const bodyGeometry = new THREE.BoxGeometry(0.5, 0.8, 0.3);
        const body = new THREE.Mesh(bodyGeometry, material);
        body.position.set(0, 1, 0);
        group.add(body);

        // Arms
        const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.6);

        const leftArm = new THREE.Mesh(armGeometry, material);
        leftArm.position.set(-0.4, 1.2, 0);
        leftArm.rotation.z = 0.3;
        group.add(leftArm);

        const rightArm = new THREE.Mesh(armGeometry, material);
        rightArm.position.set(0.4, 1.2, 0);
        rightArm.rotation.z = -0.3;
        group.add(rightArm);

        // Legs
        const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8);

        const leftLeg = new THREE.Mesh(legGeometry, material);
        leftLeg.position.set(-0.15, 0.2, 0);
        group.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeometry, material);
        rightLeg.position.set(0.15, 0.2, 0);
        group.add(rightLeg);

        return group;
    };

    if (error) {
        return (
            <div className="w-[640px] h-[480px] border-4 border-red-500 rounded-lg flex items-center justify-center bg-red-100">
                <div className="text-red-700 text-center">
                    <p className="font-bold">3D Avatar Error</p>
                    <p className="text-sm">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center">
            <h2 className="text-xl font-bold mb-4 text-green-400">🤖 Simple Avatar Test</h2>

            <div
                ref={containerRef}
                className="border-4 border-green-500 rounded-lg"
                style={{ width: '640px', height: '480px' }}
            />

            <div className="mt-4 text-center">
                <div className={`inline-block px-4 py-2 rounded ${isReady ? 'bg-green-800 text-green-200' : 'bg-yellow-800 text-yellow-200'}`}>
                    {isReady ? '✅ Avatar Ready' : '⏳ Loading...'}
                </div>
            </div>

            <div className="mt-2 text-sm text-gray-400">
                {isReady && 'Avatar should be rotating. If you see this but no avatar, there may be a WebGL issue.'}
            </div>
        </div>
    );
};

export default SimpleAvatarTest;