-- Insert Tiered Badges for LinguaLink AI
-- These badges follow the psychological framework: Recognition Before Reward

INSERT INTO public.badges (name, description, image_url, category, tier, requirement_type, requirement_value, criteria) VALUES
-- Level 1: Voice Pioneer
('Voice Pioneer', 'You are among the first voices shaping LinguaLink.', 'https://img.icons8.com/color/96/micro.png', 'social', 'bronze', 'followers_count', 100, '{"unlock_reward": "Early Access features", "motivation": "Shaping the future"}'),

-- Level 2: Cultural Connector
('Cultural Connector', 'You helped connect communities through voice.', 'https://img.icons8.com/color/96/world-map.png', 'social', 'silver', 'followers_count', 500, '{"unlock_reward": "Featured on regional leaderboard", "motivation": "Connecting communities"}'),

-- Level 3: Language Influencer
('Language Influencer', 'Your voice inspires others to speak their mother tongue.', 'https://img.icons8.com/color/96/campaign.png', 'social', 'gold', 'followers_count', 1000, '{"unlock_reward": "Eligibility for mini-campaigns", "motivation": "Inspiring others"}'),

-- Level 4: Community Validator
('Community Validator', 'Recognized for accuracy, impact, and community leadership.', 'https://img.icons8.com/color/96/verified-account.png', 'validator', 'silver', 'followers_count', 2000, '{"unlock_reward": "Validation privileges & higher visibility", "motivation": "Accuracy & Leadership"}'),

-- Level 5: Lingua Ambassador
('Lingua Ambassador', 'Your network is empowering voices across borders.', 'https://img.icons8.com/color/96/handshake.png', 'social', 'gold', 'followers_count', 5000, '{"unlock_reward": "Ambassador title + benefits", "motivation": "Empowering voices"}'),

-- Level 6 (Elite): AI Voice Leader
('AI Voice Leader', 'Your voice helped build the world''s largest language AI.', 'https://img.icons8.com/color/96/artificial-intelligence.png', 'social', 'gold', 'followers_count', 10000, '{"unlock_reward": "Early Monetization Unlock", "motivation": "Building the future of AI"}')
ON CONFLICT (name) DO NOTHING;
