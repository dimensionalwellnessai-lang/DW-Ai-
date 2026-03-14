// Restored implementation from commit 25cb362258fe9ff5ce3735df3d4a69fd65ffdcaf - modifications applied

import React from 'react';
import { Drawer, Carousel } from 'your-ui-library';
import DWReadingCard from 'your-card-library/DWReadingCard';
import InsightSnapshotCard from 'your-card-library/InsightSnapshotCard';
import './home-command-center.css'; // Make sure to include CSS for overflow-hidden styling

const HomeCommandCenter = () => {
    const [drawerOpen, setDrawerOpen] = React.useState(false);

    return (
        <div className="orbit-only-container overflow-hidden">
            {/* Other components and content here */}
            <button className="sparkles-button" onClick={() => setDrawerOpen(true)}>✨</button>
            <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
                <Carousel>
                    <DWReadingCard featureFlagGated={true} />
                    <InsightSnapshotCard />
                    {/* visibleProactiveCards should be mapped here as slides */}
                </Carousel>
            </Drawer>
        </div>
    );
};

export default HomeCommandCenter;