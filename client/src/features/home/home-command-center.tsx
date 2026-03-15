import React from 'react';
import { Drawer, Carousel } from 'your-ui-library'; // Assuming these components are imported
import DWReadingCard from 'your-path/DWReadingCard'; // Ensure this path is correct
import InsightSnapshotCard from 'your-path/InsightSnapshotCard'; // Ensure this path is correct
import ProactiveCard from 'your-path/ProactiveCard'; // Ensure this path is correct

const HomeCommandCenter = () => {
    const [showDrawer, setShowDrawer] = React.useState(false);
    const handleSparklesClick = () => setShowDrawer(true);

    return (
        <div>
            <header>
                <nav>Your Menu</nav>
                <h1>Your Title</h1>
            </header>
            <div className='greeting'>
                <h2>Welcome to the Command Center!</h2>
                <p>Your affirmation message here.</p> {/* Affirmation moved directly under greeting */}
            </div>
            <div className='orbit-ring'>
                {/* Centered and proportionate orbit ring styling */}
                <div className='circle'></div>
                <button className='sparkles-button' onClick={handleSparklesClick}>Sparkles</button>
                {/* Ensure Sparkles button is positioned at ~2 o'clock out of the orbit ring */}
            </div>
            <Drawer open={showDrawer} onClose={() => setShowDrawer(false)}>
                <Carousel>
                    <DWReadingCard featureFlag={{ enabled: true }} />
                    <InsightSnapshotCard />
                    <ProactiveCard />
                    {/* Assume visible proactive cards are included here */}
                </Carousel>
            </Drawer>
        </div>
    );
};

export default HomeCommandCenter;