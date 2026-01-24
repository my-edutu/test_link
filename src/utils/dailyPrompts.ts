// src/utils/dailyPrompts.ts
import { supabase } from '../supabaseClient';

export interface DailyPrompt {
  id: string;
  prompt_text: string;
  is_used: boolean;
  used_at?: string;
}

// Sample prompt templates - in a real app, these could be AI-generated
const PROMPT_TEMPLATES = [
  "Share a traditional greeting from your culture",
  "Tell us about your favorite childhood memory",
  "Describe your hometown in your native language",
  "Share a family recipe or cooking tradition",
  "Tell us about a local festival or celebration",
  "Describe the weather in your region today",
  "Share a proverb or saying from your language",
  "Tell us about a local landmark or place",
  "Describe your family traditions",
  "Share a story your grandparents told you",
  "Tell us about your favorite local food",
  "Describe a typical day in your community",
  "Share a traditional song or rhyme",
  "Tell us about local customs or etiquette",
  "Describe your favorite season and why",
  "Share a local legend or folktale",
  "Tell us about traditional clothing or dress",
  "Describe a local craft or skill",
  "Share a childhood game or activity",
  "Tell us about your language's unique features"
];

export const generateDailyPrompts = async (userId: string, userLanguage?: string): Promise<DailyPrompt[]> => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Check if user already has prompts for today
    const { data: existingPrompts, error: fetchError } = await supabase
      .from('daily_prompts')
      .select('*')
      .eq('user_id', userId)
      .eq('prompt_date', today);

    if (fetchError) {
      console.error('Error fetching existing prompts:', fetchError);
      return [];
    }

    // If user already has 3 prompts for today, return them
    if (existingPrompts && existingPrompts.length >= 3) {
      return existingPrompts.map(prompt => ({
        id: prompt.id,
        prompt_text: prompt.prompt_text,
        is_used: prompt.is_used,
        used_at: prompt.used_at
      }));
    }

    // Generate 3 new prompts for today
    const selectedPrompts = PROMPT_TEMPLATES
      .sort(() => Math.random() - 0.5) // Shuffle
      .slice(0, 3)
      .map((template, index) => {
        // Personalize based on language if available
        let personalizedPrompt = template;
        if (userLanguage) {
          personalizedPrompt = template.replace('your language', userLanguage);
          personalizedPrompt = personalizedPrompt.replace('your culture', `${userLanguage} culture`);
        }

        return {
          prompt_text: personalizedPrompt,
          prompt_date: today,
          user_id: userId
        };
      });

    // Insert new prompts
    const { data: newPrompts, error: insertError } = await supabase
      .from('daily_prompts')
      .insert(selectedPrompts)
      .select();

    if (insertError) {
      console.error('Error inserting daily prompts:', insertError);
      return [];
    }

    return newPrompts?.map(prompt => ({
      id: prompt.id,
      prompt_text: prompt.prompt_text,
      is_used: prompt.is_used,
      used_at: prompt.used_at
    })) || [];

  } catch (error) {
    console.error('Error generating daily prompts:', error);
    return [];
  }
};

export const markPromptAsUsed = async (promptId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('daily_prompts')
      .update({
        is_used: true,
        used_at: new Date().toISOString()
      })
      .eq('id', promptId);

    if (error) {
      console.error('Error marking prompt as used:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error marking prompt as used:', error);
    return false;
  }
};
