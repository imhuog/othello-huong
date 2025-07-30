import React from 'react';
import { useGame } from '../contexts/GameContext';
import MainMenu from '../components/MainMenu';
import GamePage from './game';

const HomePage: React.FC = () => {
  const { gameState } = useGame();

  // Show game page if there's an active game
  if (gameState) {
    return <GamePage />;
  }

  // Show main menu if no active game
  return <MainMenu />;
};

export default HomePage;
