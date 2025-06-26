import React from "react";
import PoseDetector from "@/components/PoseDetector";
import { Metadata } from "next";
import ARMirrorApp from "@/components/ArMirrorApp";
import AvatarTestPage from '@/components/AvatarTestPage';
import OptimizedARMirror from "@/components/OptimizedARMirror";

export const metadata: Metadata = {
  title: "Pose Detection",
  description: "Pose Detection using MediaPipe",
};



export default function Home() {
  return <PoseDetector />;
}