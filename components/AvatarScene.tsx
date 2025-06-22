'use client';

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';

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

interface AvatarBones {
    head: THREE.Object3D;
    torso: THREE.Object3D;
    leftShoulder: THREE.Object3D;
    rightShoulder: THREE.Object3D;
    leftElbow: THREE.Object3D;
    rightElbow: THREE.Object3D;
    leftHip: THREE.Object3D;
    rightHip: THREE.Object3D;
    leftKnee: THREE.Object3D;
    rightKnee: THREE.Object3D;
}

export interface AvatarSceneRef {
    updatePose: (poseData: PoseLandmark[]) => void;
    updateHands: (handsData: HandLandmark[][]) => void;
}

interface AvatarSceneProps {
    width?: number;
    height?: number;
    className?: string;
}

const AvatarScene = forwardRef<AvatarSceneRef, AvatarSceneProps>(
    ({ width = 640, height = 480, className = "" }, ref) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const sceneRef = useRef<THREE.Scene | null>(null);
        const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
        const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
        const avatarBonesRef = useRef<AvatarBones | null>(null);
        const animationIdRef = useRef<number | null>(null);

        // Expose methods to parent component
        useImperativeHandle(ref, () => ({
            updatePose: (poseData: PoseLandmark[]) => {
                if (avatarBonesRef.current) {
                    updateAvatarPose(poseData, avatarBonesRef.current);
                }
            },
            updateHands: (handsData: HandLandmark[][]) => {
                if (avatarBonesRef.current) {
                    updateAvatarHands(handsData, avatarBonesRef.current);
                }
            }
        }));

        // Initialize Three.js scene
        useEffect(() => {
            if (!containerRef.current) return;

            // Create scene
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0x1a1a1a);
            sceneRef.current = scene;

            // Create camera
            const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
            camera.position.set(0, 1.6, 3);
            camera.lookAt(0, 1.6, 0);
            cameraRef.current = camera;

            // Create renderer
            const renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(width, height);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            containerRef.current.appendChild(renderer.domElement);
            rendererRef.current = renderer;

            // Add lighting
            const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(5, 10, 5);
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 2048;
            directionalLight.shadow.mapSize.height = 2048;
            scene.add(directionalLight);

            // Create humanoid avatar
            const avatar = createHumanoidAvatar();
            scene.add(avatar.group);
            avatarBonesRef.current = avatar.bones;

            // Animation loop
            const animate = () => {
                animationIdRef.current = requestAnimationFrame(animate);
                renderer.render(scene, camera);
            };
            animate();

            // Handle window resize
            const handleResize = () => {
                if (camera && renderer) {
                    camera.aspect = width / height;
                    camera.updateProjectionMatrix();
                    renderer.setSize(width, height);
                }
            };

            window.addEventListener('resize', handleResize);

            // Cleanup
            return () => {
                window.removeEventListener('resize', handleResize);

                if (animationIdRef.current) {
                    cancelAnimationFrame(animationIdRef.current);
                }

                if (containerRef.current && renderer.domElement) {
                    containerRef.current.removeChild(renderer.domElement);
                }

                renderer.dispose();
                scene.clear();
            };
        }, [width, height]);

        // Create a simple humanoid avatar
        const createHumanoidAvatar = () => {
            const group = new THREE.Group();

            // Materials
            const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff88 }); // Green alien color
            const jointMaterial = new THREE.MeshLambertMaterial({ color: 0x0088ff }); // Blue joints

            // Head
            const headGeometry = new THREE.SphereGeometry(0.15, 16, 16);
            const head = new THREE.Mesh(headGeometry, bodyMaterial);
            head.position.set(0, 1.8, 0);
            head.castShadow = true;
            group.add(head);

            // Torso
            const torsoGeometry = new THREE.BoxGeometry(0.4, 0.6, 0.2);
            const torso = new THREE.Mesh(torsoGeometry, bodyMaterial);
            torso.position.set(0, 1.2, 0);
            torso.castShadow = true;
            group.add(torso);

            // Arms
            const armGeometry = new THREE.CapsuleGeometry(0.05, 0.3, 8, 16);

            // Left arm
            const leftShoulder = new THREE.Object3D();
            leftShoulder.position.set(-0.25, 1.4, 0);
            const leftUpperArm = new THREE.Mesh(armGeometry, bodyMaterial);
            leftUpperArm.position.set(0, -0.15, 0);
            leftUpperArm.castShadow = true;
            leftShoulder.add(leftUpperArm);

            const leftElbow = new THREE.Object3D();
            leftElbow.position.set(0, -0.3, 0);
            const leftForearm = new THREE.Mesh(armGeometry, bodyMaterial);
            leftForearm.position.set(0, -0.15, 0);
            leftForearm.castShadow = true;
            leftElbow.add(leftForearm);
            leftShoulder.add(leftElbow);

            // Right arm (mirrored)
            const rightShoulder = new THREE.Object3D();
            rightShoulder.position.set(0.25, 1.4, 0);
            const rightUpperArm = new THREE.Mesh(armGeometry, bodyMaterial);
            rightUpperArm.position.set(0, -0.15, 0);
            rightUpperArm.castShadow = true;
            rightShoulder.add(rightUpperArm);

            const rightElbow = new THREE.Object3D();
            rightElbow.position.set(0, -0.3, 0);
            const rightForearm = new THREE.Mesh(armGeometry, bodyMaterial);
            rightForearm.position.set(0, -0.15, 0);
            rightForearm.castShadow = true;
            rightElbow.add(rightForearm);
            rightShoulder.add(rightElbow);

            // Legs
            const legGeometry = new THREE.CapsuleGeometry(0.08, 0.4, 8, 16);

            // Left leg
            const leftHip = new THREE.Object3D();
            leftHip.position.set(-0.1, 0.9, 0);
            const leftThigh = new THREE.Mesh(legGeometry, bodyMaterial);
            leftThigh.position.set(0, -0.2, 0);
            leftThigh.castShadow = true;
            leftHip.add(leftThigh);

            const leftKnee = new THREE.Object3D();
            leftKnee.position.set(0, -0.4, 0);
            const leftShin = new THREE.Mesh(legGeometry, bodyMaterial);
            leftShin.position.set(0, -0.2, 0);
            leftShin.castShadow = true;
            leftKnee.add(leftShin);
            leftHip.add(leftKnee);

            // Right leg (mirrored)
            const rightHip = new THREE.Object3D();
            rightHip.position.set(0.1, 0.9, 0);
            const rightThigh = new THREE.Mesh(legGeometry, bodyMaterial);
            rightThigh.position.set(0, -0.2, 0);
            rightThigh.castShadow = true;
            rightHip.add(rightThigh);

            const rightKnee = new THREE.Object3D();
            rightKnee.position.set(0, -0.4, 0);
            const rightShin = new THREE.Mesh(legGeometry, bodyMaterial);
            rightShin.position.set(0, -0.2, 0);
            rightShin.castShadow = true;
            rightKnee.add(rightShin);
            rightHip.add(rightKnee);

            // Add all parts to group
            group.add(leftShoulder, rightShoulder, leftHip, rightHip);

            // Add ground plane
            const planeGeometry = new THREE.PlaneGeometry(5, 5);
            const planeMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
            const plane = new THREE.Mesh(planeGeometry, planeMaterial);
            plane.rotation.x = -Math.PI / 2;
            plane.position.y = 0;
            plane.receiveShadow = true;
            group.add(plane);

            return {
                group,
                bones: {
                    head,
                    torso,
                    leftShoulder,
                    rightShoulder,
                    leftElbow,
                    rightElbow,
                    leftHip,
                    rightHip,
                    leftKnee,
                    rightKnee
                }
            };
        };

        // Update avatar pose based on landmark data
        const updateAvatarPose = (landmarks: PoseLandmark[], bones: AvatarBones) => {
            // Head tracking (nose position)
            if (landmarks[0]) {
                const noseX = (landmarks[0].x - 0.5) * 2; // Convert to -1 to 1 range
                const noseY = -(landmarks[0].y - 0.5) * 2; // Flip Y and convert to -1 to 1 range

                bones.head.rotation.y = noseX * 0.5; // Horizontal head turn
                bones.head.rotation.x = noseY * 0.3; // Vertical head tilt
            }

            // Shoulder positions
            if (landmarks[11] && landmarks[12]) { // Left and right shoulders
                const leftShoulder = landmarks[11];
                const rightShoulder = landmarks[12];

                // Calculate shoulder tilt
                const shoulderTilt = (rightShoulder.y - leftShoulder.y) * 2;
                bones.torso.rotation.z = shoulderTilt;
            }

            // Left arm tracking
            if (landmarks[11] && landmarks[13] && landmarks[15]) { // Left shoulder, elbow, wrist
                const shoulder = landmarks[11];
                const elbow = landmarks[13];
                const wrist = landmarks[15];

                // Calculate left arm angles
                const shoulderToElbow = {
                    x: elbow.x - shoulder.x,
                    y: elbow.y - shoulder.y
                };
                const elbowToWrist = {
                    x: wrist.x - elbow.x,
                    y: wrist.y - elbow.y
                };

                // Apply rotations with smoothing
                bones.leftShoulder.rotation.z = Math.atan2(shoulderToElbow.y, shoulderToElbow.x) + Math.PI / 2;
                bones.leftElbow.rotation.z = Math.atan2(elbowToWrist.y, elbowToWrist.x) - bones.leftShoulder.rotation.z;
            }

            // Right arm tracking
            if (landmarks[12] && landmarks[14] && landmarks[16]) { // Right shoulder, elbow, wrist
                const shoulder = landmarks[12];
                const elbow = landmarks[14];
                const wrist = landmarks[16];

                // Calculate right arm angles
                const shoulderToElbow = {
                    x: elbow.x - shoulder.x,
                    y: elbow.y - shoulder.y
                };
                const elbowToWrist = {
                    x: wrist.x - elbow.x,
                    y: wrist.y - elbow.y
                };

                // Apply rotations (mirrored for right side)
                bones.rightShoulder.rotation.z = Math.atan2(shoulderToElbow.y, -shoulderToElbow.x) - Math.PI / 2;
                bones.rightElbow.rotation.z = Math.atan2(elbowToWrist.y, -elbowToWrist.x) - bones.rightShoulder.rotation.z;
            }

            // Hip and leg tracking (basic)
            if (landmarks[23] && landmarks[24]) { // Left and right hips
                const leftHip = landmarks[23];
                const rightHip = landmarks[24];

                // Calculate hip tilt
                const hipTilt = (rightHip.y - leftHip.y) * 1.5;
                bones.leftHip.rotation.z = hipTilt;
                bones.rightHip.rotation.z = hipTilt;
            }
        };

        // Update avatar hands based on hand landmark data
        const updateAvatarHands = (handsData: HandLandmark[][], bones: AvatarBones) => {
            // This will be expanded later when we add detailed hand models
            // For now, we can use this data for basic hand positioning
            if (handsData.length > 0) {
                // Basic hand presence indication - could affect arm positioning
                console.log(`Hands detected: ${handsData.length}`);
            }
        };

        return (
            <div className={className}>
                <div
                    ref={containerRef}
                    style={{ width: `${width}px`, height: `${height}px` }}
                    className="rounded-lg overflow-hidden"
                />
            </div>
        );
    }
);

AvatarScene.displayName = 'AvatarScene';

export default AvatarScene;