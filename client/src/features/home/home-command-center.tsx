// Updated component based on new design
import React from 'react';
import Orbit from './Orbit';
import SparklesButton from './SparklesButton';
import DWReadingCard from './DWReadingCard';
import InsightSnapshotCard from './InsightSnapshotCard';
import { Carousel } from 'some-carousel-library';

const HomeCommandCenter = () => {
    return (
        <div style={{ overflow: 'hidden' }}>
            <Orbit />
            <SparklesButton />
            <Drawer>
                <Carousel>
                    <DWReadingCard />
                    <InsightSnapshotCard />
                    {/* Render existing visible proactive cards here */}
                    {visibleProactiveCards.map(card => (
                        <ProactiveCard key={card.id} {...card} />
                    ))}
                </Carousel>
            </Drawer>
        </div>
    );
};

export default HomeCommandCenter;