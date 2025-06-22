import React from "react";
import PoseDetector from "@/components/PoseDetector";
import { Metadata } from "next";

const metadata: Metadata = {
  title: "Pose Detection",
  description: "Pose Detection using MediaPipe",
};

export default function Home() {
  return (
    <main>
      <PoseDetector />
    </main>
  );
}