// Full implementation from commit 25cb362258fe9ff5ce3735df3d4a69fd65ffdcaf with adjustments as per request

import React from 'react';
import { Drawer, Carousel } from 'some-drawer-library'; // Ensure correct imports
import { AFFIRMATIONS } from 'path-to-affirmations'; // Ensure correct import for affirmations
import DWReadingCard from 'path-to-DWReadingCard';
import InsightSnapshotCard from 'path-to-InsightSnapshotCard';
import CardPreview from 'path-to-CardPreview'; // Existing component

const HomeCommandCenter = () => {
    return (
        <div className="orbit-wrapper"> {/* Removed overflow-auto and Command Center header */} 
            <div className="header"> {/* Showing only orbit, greeting, and affirmation here */}
                <AFFIRMATIONS /> {/* Display affirmations */}
                {/* Place for greeting */}
            </div>
            <Drawer >
                {/* Sparkles floating icon setup */}
                <Carousel>
                    {featureFlag && <DWReadingCard />}
                    <InsightSnapshotCard />
                    {visibleProactiveCards.map(card => <CarouselItem>{card}</CarouselItem>)}
                </Carousel>
            </Drawer>
        </div>
    );
};

export default HomeCommandCenter;
