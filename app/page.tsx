import React from "react";
import PoseDetector from "@/components/PoseDetector";
import { Metadata } from "next";
import ARMirrorApp from "@/components/ArMirrorApp";
import AvatarTestPage from '@/components/AvatarTestPage';
import OptimizedARMirror from "@/components/OptimizedARMirror";
import SnapchatARFilter from "@/components/SnapchatARFilter";
import { ModelAvatarFilter } from "@/components/ModelAvatarFilter";
import FullscreenPoseTracker from "@/components/FullscreenPoseTracker";

export const metadata: Metadata = {
  title: "Pose Detection",
  description: "Pose Detection using MediaPipe",
};



export default function Home() {
  return <PoseDetector />;
}