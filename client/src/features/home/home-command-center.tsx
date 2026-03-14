import React from 'react';
import { getGreeting, getDailyAffirmation } from '../utils';
import { Drawer, Carousel } from '../components';
import { ProactiveCard, InsightSnapshotCard, DWReadingCard } from '../cards';
import { useFeatureFlag } from '../hooks';

const HomeCommandCenter = () => {
    const showDWReadingCard = useFeatureFlag('dwReading');
    const greeting = getGreeting();
    const affirmation = getDailyAffirmation();

    return (
        <div className='home-command-center'>
            <header>
                <div data-testid='header-greeting'>{greeting}</div>
                <div data-testid='header-affirmation'>{affirmation}</div>
            </header>
            <div className='orbit-container'>
                {/* Orbit ring component here */}
                <div className='orbit-ring' />
                <button data-testid='btn-open-cards' className='floating-btn' onClick={() => {/* open Drawer logic here */}}>
                    <SparklesIcon />
                </button>
            </div>
            <Drawer>
                <Carousel>
                    {showDWReadingCard && <DWReadingCard />}
                    <InsightSnapshotCard />
                    {visibleProactiveCards.length > 0 ? 
                        visibleProactiveCards.map(card => <ProactiveCard key={card.id} {...card} />) : 
                        <div>No cards available</div>}
                </Carousel>
            </Drawer>
        </div>
    );
};

export default HomeCommandCenter;