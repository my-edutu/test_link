
export interface Language {
    name: string;
    code: string;
    nativeName?: string;
    dialect?: string;
}

export interface Country {
    name: string;
    code: string; // ISO 3166-1 alpha-2
    flag: string; // Emoji flag
    languages: Language[];
}

export const COUNTRIES: Country[] = [
    // Africa
    {
        name: 'Nigeria',
        code: 'NG',
        flag: '🇳🇬',
        languages: [
            { name: 'English', code: 'en' },
            { name: 'Hausa', code: 'ha', nativeName: 'Harshen Hausa', dialect: 'Kano' },
            { name: 'Yoruba', code: 'yo', nativeName: 'Èdè Yorùbá' },
            { name: 'Igbo', code: 'ig', nativeName: 'Asụsụ Igbo' },
            { name: 'Pidgin', code: 'pcm', nativeName: 'Naijá', dialect: 'Nigerian' },
            { name: 'Efik', code: 'efi' },
            { name: 'Ibibio', code: 'ibb' },
            { name: 'Tiv', code: 'tiv' },
            { name: 'Kanuri', code: 'kr' },
            { name: 'Edo', code: 'bin' },
            { name: 'Fulfulde', code: 'ff', nativeName: 'Fulfulde' },
            { name: 'Igala', code: 'igl' },
            { name: 'Idoma', code: 'idu' },
            { name: 'Nupe', code: 'nup' },
            { name: 'Ijaw', code: 'ijc' },
            { name: 'Urhobo', code: 'urh' }
        ]
    },
    {
        name: 'Ghana',
        code: 'GH',
        flag: '🇬🇭',
        languages: [
            { name: 'English', code: 'en' },
            { name: 'Twi', code: 'tw', nativeName: 'Twi' },
            { name: 'Fante', code: 'fat' },
            { name: 'Ewe', code: 'ee', nativeName: 'Eʋegbe' },
            { name: 'Ga', code: 'ga', nativeName: 'Gã' },
            { name: 'Dagbani', code: 'dag' },
            { name: 'Hausa', code: 'ha' },
            { name: 'Nzema', code: 'nzi' },
            { name: 'Dangme', code: 'ada' }
        ]
    },
    {
        name: 'South Africa',
        code: 'ZA',
        flag: '🇿🇦',
        languages: [
            { name: 'English', code: 'en' },
            { name: 'Zulu', code: 'zu', nativeName: 'isiZulu' },
            { name: 'Xhosa', code: 'xh', nativeName: 'isiXhosa' },
            { name: 'Afrikaans', code: 'af', nativeName: 'Afrikaans' },
            { name: 'Sotho', code: 'st', nativeName: 'Sesotho' },
            { name: 'Tswana', code: 'tn', nativeName: 'Setswana' },
            { name: 'Venda', code: 've', nativeName: 'Tshivenḓa' },
            { name: 'Tsonga', code: 'ts', nativeName: 'Xitsonga' },
            { name: 'Swati', code: 'ss', nativeName: 'SiSwati' },
            { name: 'Ndebele', code: 'nr', nativeName: 'isiNdebele' }
        ]
    },
    {
        name: 'Kenya',
        code: 'KE',
        flag: '🇰🇪',
        languages: [
            { name: 'English', code: 'en' },
            { name: 'Swahili', code: 'sw', nativeName: 'Kiswahili' },
            { name: 'Kikuyu', code: 'ki', nativeName: 'Gĩkũyũ' },
            { name: 'Luo', code: 'luo', nativeName: 'Dholuo' },
            { name: 'Luhya', code: 'luy' },
            { name: 'Kamba', code: 'kam' },
            { name: 'Kalenjin', code: 'kln' }
        ]
    },
    {
        name: 'Ethiopia',
        code: 'ET',
        flag: '🇪🇹',
        languages: [
            { name: 'Amharic', code: 'am', nativeName: 'አማርኛ' },
            { name: 'Oromo', code: 'om', nativeName: 'Afaan Oromoo' },
            { name: 'Tigrinya', code: 'ti', nativeName: 'ትግርኛ' },
            { name: 'Somali', code: 'so', nativeName: 'Soomaaliga' }
        ]
    },
    {
        name: 'Egypt',
        code: 'EG',
        flag: '🇪🇬',
        languages: [
            { name: 'Arabic', code: 'ar', dialect: 'Egyptian' },
            { name: 'English', code: 'en' }
        ]
    },

    // Europe
    {
        name: 'United Kingdom',
        code: 'GB',
        flag: '🇬🇧',
        languages: [
            { name: 'English', code: 'en' },
            { name: 'Welsh', code: 'cy', nativeName: 'Cymraeg' },
            { name: 'Scottish Gaelic', code: 'gd', nativeName: 'Gàidhlig' }
        ]
    },
    {
        name: 'Germany',
        code: 'DE',
        flag: '🇩🇪',
        languages: [
            { name: 'German', code: 'de', nativeName: 'Deutsch' }
        ]
    },
    {
        name: 'France',
        code: 'FR',
        flag: '🇫🇷',
        languages: [
            { name: 'French', code: 'fr', nativeName: 'Français' },
            { name: 'Breton', code: 'br', nativeName: 'Brezhoneg' },
            { name: 'Corsican', code: 'co', nativeName: 'Corsu' }
        ]
    },
    {
        name: 'Spain',
        code: 'ES',
        flag: '🇪🇸',
        languages: [
            { name: 'Spanish', code: 'es', nativeName: 'Español' },
            { name: 'Catalan', code: 'ca', nativeName: 'Català' },
            { name: 'Galician', code: 'gl', nativeName: 'Galego' },
            { name: 'Basque', code: 'eu', nativeName: 'Euskara' }
        ]
    },
    {
        name: 'Italy',
        code: 'IT',
        flag: '🇮🇹',
        languages: [
            { name: 'Italian', code: 'it', nativeName: 'Italiano' }
        ]
    },
    {
        name: 'Ukraine',
        code: 'UA',
        flag: '🇺🇦',
        languages: [
            { name: 'Ukrainian', code: 'uk', nativeName: 'Українська' },
            { name: 'Russian', code: 'ru', nativeName: 'Русский' }
        ]
    },

    // Asia
    {
        name: 'China',
        code: 'CN',
        flag: '🇨🇳',
        languages: [
            { name: 'Mandarin', code: 'zh', nativeName: '普通话' },
            { name: 'Cantonese', code: 'yue', nativeName: '粤语' },
            { name: 'Wu', code: 'wuu' },
            { name: 'Min', code: 'min' }
        ]
    },
    {
        name: 'India',
        code: 'IN',
        flag: '🇮🇳',
        languages: [
            { name: 'Hindi', code: 'hi', nativeName: 'हिन्दी' },
            { name: 'English', code: 'en' },
            { name: 'Bengali', code: 'bn', nativeName: 'বাংলা' },
            { name: 'Telugu', code: 'te', nativeName: 'తెలుగు' },
            { name: 'Marathi', code: 'mr', nativeName: 'मराठी' },
            { name: 'Tamil', code: 'ta', nativeName: 'தமிழ்' },
            { name: 'Urdu', code: 'ur', nativeName: 'اردو' },
            { name: 'Gujarati', code: 'gu', nativeName: 'ગુજરાતી' },
            { name: 'Kannada', code: 'kn', nativeName: 'ಕನ್ನಡ' },
            { name: 'Malayalam', code: 'ml', nativeName: 'മലയാളം' },
            { name: 'Punjabi', code: 'pa', nativeName: 'ਪੰਜਾਬੀ' }
        ]
    },
    {
        name: 'Japan',
        code: 'JP',
        flag: '🇯🇵',
        languages: [
            { name: 'Japanese', code: 'ja', nativeName: '日本語' }
        ]
    },
    {
        name: 'South Korea',
        code: 'KR',
        flag: '🇰🇷',
        languages: [
            { name: 'Korean', code: 'ko', nativeName: '한국어' }
        ]
    },
    {
        name: 'Indonesia',
        code: 'ID',
        flag: '🇮🇩',
        languages: [
            { name: 'Indonesian', code: 'id', nativeName: 'Bahasa Indonesia' },
            { name: 'Javanese', code: 'jv', nativeName: 'Basa Jawa' },
            { name: 'Sundanese', code: 'su', nativeName: 'Basa Sunda' }
        ]
    },
    {
        name: 'Vietnam',
        code: 'VN',
        flag: '🇻🇳',
        languages: [
            { name: 'Vietnamese', code: 'vi', nativeName: 'Tiếng Việt' }
        ]
    },

    // Americas
    {
        name: 'United States',
        code: 'US',
        flag: '🇺🇸',
        languages: [
            { name: 'English', code: 'en' },
            { name: 'Spanish', code: 'es' }
        ]
    },
    {
        name: 'Brazil',
        code: 'BR',
        flag: '🇧🇷',
        languages: [
            { name: 'Portuguese', code: 'pt', nativeName: 'Português', dialect: 'Brazilian' }
        ]
    },
    {
        name: 'Mexico',
        code: 'MX',
        flag: '🇲🇽',
        languages: [
            { name: 'Spanish', code: 'es' },
            { name: 'Nahuatl', code: 'nah' },
            { name: 'Maya', code: 'myn' }
        ]
    },
    {
        name: 'Canada',
        code: 'CA',
        flag: '🇨🇦',
        languages: [
            { name: 'English', code: 'en' },
            { name: 'French', code: 'fr' }
        ]
    },

    // Oceania
    {
        name: 'Australia',
        code: 'AU',
        flag: '🇦🇺',
        languages: [
            { name: 'English', code: 'en' }
        ]
    },

    // Middle East
    {
        name: 'United Arab Emirates',
        code: 'AE',
        flag: '🇦🇪',
        languages: [
            { name: 'Arabic', code: 'ar' },
            { name: 'English', code: 'en' }
        ]
    },
    {
        name: 'Saudi Arabia',
        code: 'SA',
        flag: '🇸🇦',
        languages: [
            { name: 'Arabic', code: 'ar' }
        ]
    },
    {
        name: 'Turkey',
        code: 'TR',
        flag: '🇹🇷',
        languages: [
            { name: 'Turkish', code: 'tr', nativeName: 'Türkçe' },
            { name: 'Kurdish', code: 'ku', nativeName: 'Kurdî' }
        ]
    },
    {
        name: 'Russia',
        code: 'RU',
        flag: '🇷🇺',
        languages: [
            { name: 'Russian', code: 'ru', nativeName: 'Русский' },
            { name: 'Tatar', code: 'tt', nativeName: 'Татарча' },
            { name: 'Chechen', code: 'ce', nativeName: 'Нохчийн мотт' }
        ]
    }
];

// Helper to get flattened unique languages sorted alphabetically
export const ALL_LANGUAGES = COUNTRIES.flatMap(c => c.languages)
    .reduce((unique: Language[], item) => {
        // Avoid duplicates by name (or code if you prefer)
        const exists = unique.find(l => l.name === item.name);
        if (!exists) {
            unique.push(item);
        }
        return unique;
    }, [])
    .sort((a, b) => a.name.localeCompare(b.name));
