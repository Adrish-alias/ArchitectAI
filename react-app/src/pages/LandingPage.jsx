import { useNavigate } from 'react-router-dom';
import AnimatedShaderHero from '../components/ui/AnimatedShaderHero';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <AnimatedShaderHero
      trustBadge={{
        text: 'Amazon Bedrock · Llama 3.3 · Gemini 2.5',
        icons: ['✦'],
      }}
      headline={{
        line1: 'YOUR CLOUD',
        line2: 'ARCHITECT AI',
      }}
      subtitle="Describe your idea in plain English. Get a complete AWS architecture, cost estimates, and a visual diagram — or analyse an existing design for improvements."
      buttons={{
        primary: {
          text: '⚡ Generate Architecture',
          onClick: () => navigate('/generate'),
        },
        secondary: {
          text: '🔍 Analyse Your Design',
          onClick: () => navigate('/analyse'),
        },
      }}
    />
  );
}
