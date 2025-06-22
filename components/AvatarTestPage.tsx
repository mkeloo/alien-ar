'use client';

import SimpleAvatarTest from './SimpleAvatarTest';

const AvatarTestPage: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
            <h1 className="text-3xl font-bold mb-8 text-center">
                🧪 Avatar Test - Isolated 3D Scene
            </h1>

            <SimpleAvatarTest />

            <div className="mt-8 max-w-2xl text-center">
                <h3 className="text-lg font-semibold mb-4 text-blue-400">Debug Checklist:</h3>
                <div className="bg-gray-800 rounded-lg p-4 text-left">
                    <div className="space-y-2 text-sm">
                        <div>✅ If you see a green rotating alien → Three.js works!</div>
                        <div>❌ If you see empty white space → WebGL issue</div>
                        <div>🔍 Check browser console for Three.js errors</div>
                        <div>💻 Try different browser if needed</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AvatarTestPage;