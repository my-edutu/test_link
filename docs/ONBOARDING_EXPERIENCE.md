# 🚀 LinguaLink: The Ultimate Onboarding Experience

**Vibe Check:** Youthful, High-Energy, Culturally Rooted, & Premium.
**Goal:** Hook the user in the first 5 seconds. "This isn't just an app; it's a movement."

Below is the complete walkthrough of the onboarding flow, including the design implementation code (HTML/Tailwind) for each stage.

---

## 1. 🌊 The Splash Screen (0-3s)
*The First Impression. A vibrant, glowing audio waveform pulses rhythmically in the center while the Heritage Engine "initializes".*

### Design Implementation
```html
<!-- LinguaLink Splash Screen -->
<!DOCTYPE html>
<html class="dark" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "primary": "#a413ec",
                        "accent-orange": "#ff6d00",
                        "background-light": "#f7f6f8",
                        "background-dark": "#0a050c",
                    },
                    fontFamily: {
                        "display": ["Plus Jakarta Sans"]
                    },
                    borderRadius: {"DEFAULT": "1rem", "lg": "2rem", "xl": "3rem", "full": "9999px"},
                },
            },
        }
    </script>
<style>
    .glow-effect { box-shadow: 0 0 40px 10px rgba(164, 19, 236, 0.3); }
    .waveform-bar { width: 4px; border-radius: 9999px; background: linear-gradient(to top, #a413ec, #ff6d00); }
    body { min-height: max(884px, 100dvh); }
</style>
</head>
<body class="bg-background-dark font-display antialiased overflow-hidden">
<div class="relative flex h-screen w-full flex-col items-center justify-between bg-background-dark py-20 px-6">
<!-- Top App Bar (Hidden/Transparent for Splash) -->
<div class="w-full flex justify-between items-center opacity-0">
<span class="material-symbols-outlined text-white">signal_cellular_alt</span>
<span class="material-symbols-outlined text-white">battery_full</span>
</div>
<!-- Central Content Area -->
<div class="flex flex-col items-center justify-center w-full grow gap-16">
<!-- Logo Container -->
<div class="flex flex-col items-center gap-4">
<div class="relative flex items-center justify-center w-24 h-24 rounded-xl bg-primary/10 border border-primary/30">
<span class="material-symbols-outlined text-primary !text-5xl" style="font-variation-settings: 'FILL' 1, 'wght' 700;">language</span>
<!-- Decorative Glow behind logo -->
<div class="absolute inset-0 bg-primary/20 blur-2xl rounded-full"></div>
</div>
<div class="flex flex-col items-center">
<h1 class="text-white text-3xl font-bold tracking-tight">Lingua<span class="text-primary">Link</span></h1>
</div>
</div>
<!-- Neon Waveform Visualization -->
<div class="relative flex items-end justify-center gap-1.5 h-32 w-full max-w-xs">
<!-- Radial Glow Background -->
<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 bg-primary/20 blur-[60px] rounded-full"></div>
<!-- Bars of the waveform -->
<div class="waveform-bar h-12 opacity-40"></div>
<div class="waveform-bar h-20 opacity-50"></div>
<div class="waveform-bar h-16 opacity-60"></div>
<div class="waveform-bar h-28 opacity-80"></div>
<div class="waveform-bar h-32 shadow-[0_0_15px_rgba(164,19,236,0.8)]"></div>
<div class="waveform-bar h-24 opacity-90 shadow-[0_0_10px_rgba(255,109,0,0.5)]"></div>
<div class="waveform-bar h-28 shadow-[0_0_15px_rgba(164,19,236,0.8)]"></div>
<div class="waveform-bar h-14 opacity-70"></div>
<div class="waveform-bar h-22 opacity-50"></div>
<div class="waveform-bar h-10 opacity-30"></div>
<div class="waveform-bar h-16 opacity-40"></div>
</div>
</div>
<!-- Footer / Initialization State -->
<div class="w-full max-w-xs flex flex-col gap-6">
<div class="flex flex-col gap-3">
<div class="flex justify-between items-center px-1">
<p class="text-white/40 text-xs font-medium uppercase tracking-widest">Initializing heritage engine</p>
<p class="text-primary text-xs font-bold uppercase tracking-widest">74%</p>
</div>
<!-- Progress Bar Component -->
<div class="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
<div class="h-full rounded-full bg-gradient-to-r from-primary to-accent-orange" style="width: 74%;"></div>
</div>
</div>
<!-- Minimalist visual vibe elements -->
<div class="flex justify-center gap-8 opacity-20">
<span class="material-symbols-outlined text-white !text-sm">graphic_eq</span>
<span class="material-symbols-outlined text-white !text-sm">translate</span>
<span class="material-symbols-outlined text-white !text-sm">mic</span>
</div>
</div>
<!-- Bottom Safe Area Indicator -->
<div class="w-32 h-1.5 bg-white/10 rounded-full mt-4"></div>
</div>
<!-- Background Images / Textures -->
<div class="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
<div class="absolute top-0 left-0 w-full h-full opacity-10" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuCiPNOV7oFFDT3HPtjtN_M3e-aOIM5WvogZUFO3qQ0L40-OiFCIlWLryz9j60M7o9ZrS_w4MTLKGpsrAkNCQUIzAKxEJGnj5J_YqDM27wk9WjtpFh3IvDP0EZeZ-MM6Lx0U2UIdIUSVb7TFcDY_S9iY-ENjJnds229goxnwwtAOQM92W0OdwT7Qs8niKl19nZgsDIHifFxJ-67UiMOHjHgBLTd7lzZ0ePQHubGQWPMVClAoDHttO0VbFpYpJkye8pXF9-_UmzYKE7n4'); background-size: cover;"></div>
<div class="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full"></div>
<div class="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-accent-orange/5 blur-[120px] rounded-full"></div>
</div>
</body></html>
```

---

## 2. 📱 The Onboarding Experience
*Swipeable cards that sell the vision: Preserving Heritage, Community, and Rewards.*

### Design Implementation (Slide: "Preserve Heritage")
```html
<!-- Onboarding: Preserve Heritage -->
<!DOCTYPE html>
<html class="dark" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>LinguaLink Onboarding</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "primary": "#a413ec",
                        "background-light": "#f7f6f8",
                        "background-dark": "#1c1022",
                    },
                    fontFamily: { "display": ["Plus Jakarta Sans", "sans-serif"] },
                    borderRadius: { "DEFAULT": "1rem", "lg": "2rem", "xl": "3rem", "full": "9999px" },
                },
            },
        }
    </script>
<style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; min-height: max(884px, 100dvh); }
    .bg-mesh {
        background-image: radial-gradient(at 0% 0%, rgba(164, 19, 236, 0.15) 0px, transparent 50%),
                          radial-gradient(at 100% 100%, rgba(164, 19, 236, 0.1) 0px, transparent 50%);
    }
</style>
</head>
<body class="bg-background-light dark:bg-background-dark antialiased">
<div class="relative flex h-screen w-full flex-col bg-background-light dark:bg-background-dark overflow-hidden bg-mesh">
<!-- Top App Bar Component -->
<div class="flex items-center p-4 pb-2 justify-between">
<div class="w-10"></div>
<h2 class="text-slate-900 dark:text-white text-sm font-bold leading-tight tracking-wider uppercase flex-1 text-center">Amplify Your Voice</h2>
<button class="w-10 text-slate-900 dark:text-white"><span class="material-symbols-outlined">help_outline</span></button>
</div>
<div class="flex flex-col flex-1 justify-between pb-10">
<!-- Hero Image Component -->
<div class="flex-1 flex items-center justify-center px-8">
<div class="relative w-full aspect-square max-w-sm">
<div class="absolute inset-0 bg-primary/20 blur-[80px] rounded-full"></div>
<div class="relative w-full h-full bg-center bg-no-repeat bg-contain flex flex-col justify-end overflow-hidden rounded-xl" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuAGl3VFweRuwz-1ZBN_6D7XRe9bO1MKgjlZU92kkw2WazgvQNIlwEkMe_Sw7jhueUyNqwxZF-LbGvgn_mys9isLreyrI2cT7iwWBFSAAML3h0OODugL-xO9mIBAMw6M1g47-3AJqWW7Rm8sd0O9-mVJF-VpBl9gM6_BTS5GV4gn4F06odi-1i4pEpuQuPSpGK07hXCSf7N76RREGMTdSK-RqkqO9tkwtoDbtbh7ieC3MkQAQjiPW5QsQQAYFoyKDs4MLQN5QL0UhN3f");'>
</div>
</div>
</div>
<!-- Content Section -->
<div class="px-6 space-y-2">
<h1 class="text-slate-900 dark:text-white tracking-tight text-[36px] font-extrabold leading-tight text-center">Preserve Our <span class="text-primary">Heritage</span></h1>
<p class="text-slate-600 dark:text-slate-300 text-lg font-medium leading-relaxed text-center px-4">Your voice is powerful. Join thousands of Nigerians preserving our local languages for the future.</p>
<!-- Page Indicators -->
<div class="flex w-full flex-row items-center justify-center gap-3 py-8">
<div class="h-2.5 w-8 rounded-full bg-primary"></div>
<div class="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700"></div>
<div class="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700"></div>
</div>
</div>
<!-- Footer / Action Area -->
<div class="px-6 w-full">
<button class="w-full bg-primary hover:bg-primary/90 text-white font-bold py-5 px-6 rounded-full flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-primary/25">
<span class="text-lg">Get Started</span>
<span class="material-symbols-outlined">arrow_forward</span>
</button>
<p class="text-slate-400 dark:text-slate-500 text-sm text-center mt-6">Already have an account? <span class="text-primary font-bold">Sign In</span></p>
</div>
</div>
<div class="h-6"></div>
</div>
</body></html>
```

---

## 3. 🔐 The Auth Hub
*Seamless social login and secure email signup.*

### Design Implementation
```html
<!-- Auth Hub Landing -->
<!DOCTYPE html>
<html class="dark" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>LinguaLink Auth Hub</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "primary": "#a413ec",
                        "background-light": "#f7f6f8",
                        "background-dark": "#0c0c0c",
                        "card-dark": "#1A1A1A",
                    },
                    fontFamily: { "display": ["Plus Jakarta Sans", "sans-serif"] },
                    borderRadius: { "DEFAULT": "1rem", "lg": "2rem", "xl": "3rem", "full": "9999px" },
                },
            },
        }
    </script>
<style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; min-height: max(884px, 100dvh); }
    .bg-mesh {
        background-image: radial-gradient(at 0% 0%, rgba(164, 19, 236, 0.15) 0px, transparent 50%),
                          radial-gradient(at 100% 100%, rgba(164, 19, 236, 0.1) 0px, transparent 50%);
    }
</style>
</head>
<body class="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white transition-colors duration-300">
<div class="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-mesh max-w-[430px] mx-auto shadow-2xl">
<!-- Header -->
<div class="flex items-center p-4 pb-2 justify-between">
<div class="text-slate-900 dark:text-white flex size-12 shrink-0 items-center justify-center cursor-pointer hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-all">
<span class="material-symbols-outlined">close</span>
</div>
<h2 class="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">LinguaLink</h2>
</div>
<!-- Hero -->
<div class="flex flex-col items-center px-6 pt-12 pb-8">
<div class="w-20 h-20 mb-6 flex items-center justify-center bg-primary/10 rounded-xl">
<span class="material-symbols-outlined text-primary text-5xl">language_pinyin</span>
</div>
<h1 class="text-slate-900 dark:text-white tracking-tight text-[32px] font-extrabold leading-tight text-center pb-3">Welcome to LinguaLink! 👋</h1>
<p class="text-slate-600 dark:text-slate-400 text-base font-medium leading-normal text-center max-w-[280px]">Preserving our voices, one word at a time.</p>
</div>
<!-- Auth Buttons -->
<div class="flex-1 flex flex-col px-6 pb-12">
<div class="flex flex-col gap-4 mb-8">
<button class="flex w-full cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-full h-[56px] px-5 bg-white dark:bg-card-dark text-slate-900 dark:text-white text-base font-bold leading-normal tracking-[0.015em] border border-slate-200 dark:border-white/10 shadow-sm active:scale-95 transition-transform"><span class="material-symbols-outlined">google</span><span class="truncate">Continue with Google</span></button>
<button class="flex w-full cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-full h-[56px] px-5 bg-black text-white text-base font-bold leading-normal tracking-[0.015em] active:scale-95 transition-transform"><span class="material-symbols-outlined">ios</span><span class="truncate">Continue with Apple</span></button>
</div>
<div class="relative flex items-center py-4 mb-8">
<div class="flex-grow border-t border-slate-200 dark:border-white/10"></div>
<span class="flex-shrink mx-4 text-slate-400 dark:text-slate-500 text-sm font-bold tracking-widest uppercase">Or sign up with email</span>
<div class="flex-grow border-t border-slate-200 dark:border-white/10"></div>
</div>
<div class="flex flex-col gap-4">
<button class="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-full h-[56px] px-5 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] shadow-lg shadow-primary/20 active:scale-95 transition-transform"><span class="truncate">Create Account</span></button>
</div>
<div class="flex-grow"></div>
<div class="mt-8 text-center pb-6">
<p class="text-slate-500 dark:text-slate-400 font-medium">Already have an account? <a class="text-primary font-bold hover:underline underline-offset-4 decoration-2" href="#">Log In</a></p>
</div>
</div>
<div class="h-8 w-full bg-transparent"></div>
</div>
</body></html>
```

---

## 4. 👤 The "You" Page (Profile Setup)
*Quick personalization: Languages, Region, and Avatar.*

### Design Implementation
```html
<!-- Profile Setup -->
<!DOCTYPE html>
<html class="dark" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>LinguaLink - Profile Setup</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
      tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            colors: {
              "primary": "#a413ec",
              "background-light": "#f7f6f8",
              "background-dark": "#1c1022",
            },
            fontFamily: { "display": ["Plus Jakarta Sans", "sans-serif"] },
            borderRadius: {"DEFAULT": "1rem", "lg": "2rem", "xl": "3rem", "full": "9999px"},
          },
        },
      }
    </script>
<style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; min-height: max(884px, 100dvh); }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
</head>
<body class="bg-background-light dark:bg-background-dark text-white font-display antialiased">
<div class="relative flex min-h-screen w-full flex-col max-w-[430px] mx-auto overflow-x-hidden">
<div class="flex items-center bg-background-light dark:bg-background-dark p-4 pb-2 justify-between sticky top-0 z-10">
<div class="text-primary flex size-12 shrink-0 items-center cursor-pointer"><span class="material-symbols-outlined">arrow_back_ios</span></div>
<h2 class="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">Profile Setup</h2>
</div>
<div class="flex flex-col gap-3 p-4">
<div class="flex gap-6 justify-between"><p class="text-gray-600 dark:text-gray-300 text-sm font-medium leading-normal uppercase tracking-wider">Step 2 of 3</p><p class="text-primary text-sm font-bold">66%</p></div>
<div class="rounded-full bg-gray-200 dark:bg-[#3c2348] h-2.5 w-full overflow-hidden"><div class="h-full rounded-full bg-primary" style="width: 66%;"></div></div>
</div>
<div class="px-4 pt-6">
<h1 class="text-gray-900 dark:text-white tracking-tight text-[32px] font-bold leading-tight text-left">What do you speak?</h1>
<p class="text-gray-500 dark:text-gray-400 mt-2">Select the languages you're familiar with or want to explore.</p>
</div>
<!-- Chips -->
<div class="flex gap-3 p-4 flex-wrap">
<div class="flex h-11 shrink-0 items-center justify-center gap-x-2 rounded-full bg-primary pl-5 pr-5 shadow-lg shadow-primary/20 cursor-pointer"><p class="text-white text-sm font-semibold leading-normal">Yoruba</p><span class="material-symbols-outlined text-sm">check_circle</span></div>
<div class="flex h-11 shrink-0 items-center justify-center gap-x-2 rounded-full bg-gray-200 dark:bg-[#3c2348] pl-5 pr-5 cursor-pointer"><p class="text-gray-800 dark:text-white text-sm font-medium leading-normal">Igbo</p></div>
<div class="flex h-11 shrink-0 items-center justify-center gap-x-2 rounded-full bg-primary pl-5 pr-5 shadow-lg shadow-primary/20 cursor-pointer"><p class="text-white text-sm font-semibold leading-normal">Hausa</p><span class="material-symbols-outlined text-sm">check_circle</span></div>
<div class="flex h-11 shrink-0 items-center justify-center gap-x-2 rounded-full bg-gray-200 dark:bg-[#3c2348] pl-5 pr-5 cursor-pointer"><p class="text-gray-800 dark:text-white text-sm font-medium leading-normal">Pidgin</p></div>
<div class="flex h-11 shrink-0 items-center justify-center gap-x-2 rounded-full border border-gray-300 dark:border-[#553267] pl-5 pr-5 cursor-pointer"><span class="material-symbols-outlined text-gray-500 text-base">add</span><p class="text-gray-500 dark:text-gray-400 text-sm font-medium leading-normal">Other</p></div>
</div>
<!-- Region -->
<div class="px-4 pb-2 pt-6"><h3 class="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Where are you from?</h3></div>
<div class="px-4">
<div class="relative w-full">
<select class="w-full h-14 bg-gray-100 dark:bg-[#2d1a36] border-none rounded-full px-6 text-gray-900 dark:text-white font-medium appearance-none focus:ring-2 focus:ring-primary">
<option disabled="" selected="" value="">Select your region or state</option>
<option value="lagos">Lagos State</option>
<option value="abuja">Abuja (FCT)</option>
</select>
<div class="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-primary"><span class="material-symbols-outlined">expand_more</span></div>
</div>
</div>
<!-- Avatar -->
<div class="px-4 pb-2 pt-8"><h3 class="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Choose your vibe</h3></div>
<div class="flex gap-4 overflow-x-auto px-4 pb-6 hide-scrollbar">
<div class="flex flex-col items-center gap-2 shrink-0"><div class="size-20 rounded-full bg-gray-200 dark:bg-[#3c2348] border-2 border-dashed border-primary/40 flex items-center justify-center cursor-pointer"><span class="material-symbols-outlined text-primary text-3xl">add_a_photo</span></div><span class="text-[10px] font-bold text-gray-500 uppercase">Upload</span></div>
<div class="flex flex-col items-center gap-2 shrink-0"><div class="size-20 rounded-full border-4 border-primary p-0.5 overflow-hidden ring-4 ring-primary/10"><img class="w-full h-full object-cover rounded-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCSD8kCKoHcV55KVae7-0y6IKiTAxHep-jh3Ai8BC9-f9xXvu_6vc-fL1kGbJS_hJN8ZQHvovplYB43MXxOUSQ3yGWZnzx41jbSl7dfzWUSFzKgYjq8HX-261evcmK3agCB2WW_dU77zQN9goeCPflqBJFCVM43U3hVZKtK4ulzDIZKaWDOhR4aj2VJAvMNuTh7zzklGU-ctZBP3PV_ItsO_NfKU3dcufw5AN6gvcsAjPvAG86vSY5ALr_V6mc6av6Uoz_7rUfDbi6d"/></div><span class="text-[10px] font-bold text-primary uppercase">Active</span></div>
</div>
<div class="h-32"></div>
<div class="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-gradient-to-t from-background-light dark:from-background-dark via-background-light dark:via-background-dark to-transparent p-6 pt-10">
<button class="w-full bg-primary text-white h-16 rounded-full font-bold text-lg shadow-2xl shadow-primary/40 flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform active:scale-[0.98]">Enter the App <span class="material-symbols-outlined">rocket_launch</span></button>
</div>
</div>
</body></html>
```

---

## 5. 🏠 The Grand Entrance (Home Screen)
*First landing after setup. Confetti pop, "Record" coach mark, and personalized greeting.*

### Design Implementation
```html
<!-- Home Screen Arrival -->
<!DOCTYPE html>
<html class="dark" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>LinguaLink - Grand Entrance</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "primary": "#a413ec",
                        "background-light": "#f7f6f8",
                        "background-dark": "#1c1022",
                    },
                    fontFamily: { "display": ["Plus Jakarta Sans", "sans-serif"] },
                    borderRadius: {"DEFAULT": "1rem", "lg": "2rem", "xl": "3rem", "full": "9999px"},
                },
            },
        }
    </script>
<style>
    .confetti-overlay {
        background-image: radial-gradient(circle, #a413ec 1px, transparent 1px);
        background-size: 20px 20px;
        mask-image: linear-gradient(to bottom, black, transparent);
    }
    .glow-pulse { animation: pulse 2s infinite; }
    @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(164, 19, 236, 0.7); }
        70% { box-shadow: 0 0 0 20px rgba(164, 19, 236, 0); }
        100% { box-shadow: 0 0 0 0 rgba(164, 19, 236, 0); }
    }
    body { min-height: max(884px, 100dvh); }
</style>
</head>
<body class="bg-background-light dark:bg-background-dark font-display text-white overflow-x-hidden min-h-screen relative">
<div class="absolute inset-0 pointer-events-none opacity-30 confetti-overlay"></div>
<!-- Top Bar -->
<div class="relative flex items-center bg-transparent p-4 pb-2 justify-between z-10">
<div class="flex size-12 shrink-0 items-center"><div class="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-primary" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuCWIluzWQnX_e-XoQljT1qEK3W1TepJPuBa6NQm_5wTZVYVniax_zYOr3XAUNrEEreEnwMQoAE94yRVPEwf4WQ4K4XoWaKEVq4kUF-c3SZ6km-aP9-rtYjA3joMykOQClSxcNeWCdddL9HgCtAlf9vzoeS2KctdFfAZDkKLtxFI0qBbVYhd6C1BR-T7YW9D2IMnO-OeGk_RqAo1AJmgNk1iMNwWHAsRgi3mYTO0NGr5htGA0ehmdKqm9xpO7NZo9E2tFBb6JCCrrs1C");'></div></div>
<div class="flex-1 px-3"><h2 class="text-white text-lg font-bold leading-tight tracking-tight">LinguaLink</h2></div>
<div class="flex w-12 items-center justify-end"><button class="flex size-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white"><span class="material-symbols-outlined">notifications</span></button></div>
</div>
<!-- Main Content -->
<div class="relative z-10 px-4">
<h1 class="text-white tracking-tight text-[32px] font-extrabold leading-tight pt-8 pb-2">Ekaabo, Tunde! 👋<br/><span class="text-primary/90 text-2xl font-bold">Ready to record your first prompt?</span></h1>
<p class="text-white/60 text-base font-normal pb-6">Your voice helps preserve the beauty of Yoruba for generations.</p>
<!-- Stats -->
<div class="flex flex-wrap gap-4 mb-8">
<div class="flex min-w-[140px] flex-1 flex-col gap-2 rounded-xl p-5 bg-white/5 border border-white/10">
<p class="text-white/70 text-sm font-medium">Daily Goal</p>
<div class="flex items-end gap-2"><p class="text-white text-2xl font-bold">2/10</p><p class="text-[#0bda76] text-xs font-bold mb-1">+20%</p></div>
<div class="w-full bg-white/10 h-1.5 rounded-full mt-1"><div class="bg-primary h-full rounded-full" style="width: 20%"></div></div>
</div>
<div class="flex min-w-[140px] flex-1 flex-col gap-2 rounded-xl p-5 bg-white/5 border border-white/10">
<p class="text-white/70 text-sm font-medium">Global Rank</p>
<div class="flex items-end gap-2"><p class="text-white text-2xl font-bold">#42</p><p class="text-[#0bda76] text-xs font-bold mb-1">↑ 5</p></div>
</div>
</div>
</div>
<!-- Coach Mark -->
<div class="fixed inset-0 bg-black/40 pointer-events-none z-20"></div>
<div class="fixed inset-x-0 bottom-24 flex flex-col items-center justify-center z-30">
<div class="mb-6 bg-white text-background-dark px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 shadow-2xl animate-bounce"><span class="material-symbols-outlined text-primary text-lg">auto_awesome</span> Tap here to start!</div>
<button class="relative flex flex-col items-center justify-center">
<div class="absolute inset-0 rounded-full bg-primary/30 blur-2xl scale-150"></div>
<div class="size-24 rounded-full bg-primary flex items-center justify-center glow-pulse relative z-10 border-4 border-white/20"><span class="material-symbols-outlined text-white text-4xl">mic</span></div>
<span class="mt-4 text-white font-bold text-lg tracking-wide uppercase">Record Voice</span>
</button>
</div>
<!-- Nav -->
<div class="fixed bottom-0 left-0 right-0 bg-background-dark/80 backdrop-blur-xl border-t border-white/10 px-6 py-4 flex justify-between items-center z-40">
<button class="flex flex-col items-center gap-1 text-primary"><span class="material-symbols-outlined">home</span><span class="text-[10px] font-bold">Home</span></button>
<button class="flex flex-col items-center gap-1 text-white/40"><span class="material-symbols-outlined">library_music</span><span class="text-[10px] font-bold">Library</span></button>
<div class="w-12"></div>
<button class="flex flex-col items-center gap-1 text-white/40"><span class="material-symbols-outlined">groups</span><span class="text-[10px] font-bold">Community</span></button>
<button class="flex flex-col items-center gap-1 text-white/40"><span class="material-symbols-outlined">person</span><span class="text-[10px] font-bold">Profile</span></button>
</div>
</body></html>
```
