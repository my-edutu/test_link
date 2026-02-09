
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
    user_ids: string[]
    title: string
    body: string
    data?: Record<string, any>
}

// Initialize Supabase Client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

Deno.serve(async (req) => {
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { user_ids, title, body, data } = await req.json() as NotificationRequest

        if (!user_ids || user_ids.length === 0) {
            return new Response(JSON.stringify({ error: 'No user_ids provided' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        // 1. Fetch push tokens for these users
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, expo_push_token')
            .in('id', user_ids)
            .not('expo_push_token', 'is', null)

        if (profileError) {
            throw profileError
        }

        const tokens = profiles?.map(p => p.expo_push_token).filter(t => t) || []

        if (tokens.length === 0) {
            return new Response(JSON.stringify({ message: 'No valid push tokens found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // 2. Send to Expo Push API
        // Expo accepts batches of 100. For simplicity, we send one batch here.
        const messages = tokens.map(token => ({
            to: token,
            title,
            body,
            data,
            sound: 'default',
        }))

        const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messages),
        })

        const expoResult = await expoResponse.json()

        return new Response(JSON.stringify({ success: true, data: expoResult }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
