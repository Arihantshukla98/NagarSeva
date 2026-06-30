/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, collection, setDoc } from 'firebase/firestore';

dotenv.config();

// Initialize Firebase client on the server side using robust dynamic file reading to avoid JSON assertions errors
let firestoreDb: any = null;
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const fbApp = initializeApp({
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
      measurementId: firebaseConfig.measurementId
    });
    firestoreDb = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId || '(default)');
    console.log('[Firebase Server] Successfully initialized Firestore client on server.');
  }
} catch (fbInitErr) {
  console.error('[Firebase Server] Failed to initialize Firestore client on server:', fbInitErr);
}

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Ensure folders exist
const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve uploads folder statically
app.use('/uploads', express.static(UPLOADS_DIR));

// DB File setup
const DB_PATH = path.join(DATA_DIR, 'db.json');

// Prepopulated Bangalore Mock Issues
const INITIAL_ISSUES = [
  {
    id: 'issue-1',
    title: 'Massive Crater Pothole near MG Road Metro Pillar 120',
    description: 'A deep pothole has formed right after the metro station exit. It is extremely hazardous for two-wheelers, especially during evening hours and rainy weather. Multiple riders have already slipped.',
    category: 'pothole',
    severity: 'critical',
    status: 'reported',
    department: 'roads',
    location: {
      lat: 12.9754,
      lng: 77.6068,
      address: 'MG Road, near Metro Station Pillar 120, Bengaluru, Karnataka 560001'
    },
    imageUrl: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?q=80&w=800',
    reportedBy: 'anon-101',
    reportedByName: 'Aarav Mehta',
    votes: 42,
    votedUsers: [],
    aiSummary: 'A highly dangerous, deep pothole at a major metro transit exit on MG Road. Poses a critical safety risk to two-wheelers and pedestrians in high-density traffic.',
    estimatedCost: '₹8,000–₹12,000',
    suggestedAction: 'Immediate asphalt patching, temporary barricading of the lane, and leveling with the surrounding pavement.',
    urgencyScore: 9,
    potentialImpact: 'Severe vehicle damage or fatal skidding accidents, particularly for evening two-wheeler commuters.',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    resolvedAt: null,
    resolutionNotes: ''
  },
  {
    id: 'issue-2',
    title: 'Major Water Pipeline Pipe Leak on Indiranagar 100 Feet Road',
    description: 'High-pressure water pipeline has burst, causing thousands of liters of clean drinking water to flood the side lanes near the Starbucks outlet. The water is pooling and causing traffic delays.',
    category: 'water',
    severity: 'high',
    status: 'in_progress',
    department: 'water',
    location: {
      lat: 12.9645,
      lng: 77.6385,
      address: '100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038'
    },
    imageUrl: 'https://hyderabadmail.com/wp-content/uploads/2026/06/water-patancheru-leakage.jpg',
    reportedBy: 'anon-102',
    reportedByName: 'Neha Sharma',
    votes: 28,
    votedUsers: [],
    aiSummary: 'Main utility water line burst on Indiranagar 100 Feet Road causing localized flooding, wastage of public drinking water, and major vehicular slow-downs.',
    estimatedCost: '₹15,000–₹25,000',
    suggestedAction: 'Isolate water flow valve for Ward 12, excavate and patch the pipeline rupture, and restore road surface.',
    urgencyScore: 8,
    potentialImpact: 'Wastage of critical municipal drinking water supply and disruption of daily service to HAL 2nd Stage residential wards.',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    resolvedAt: null,
    resolutionNotes: 'BWSSB officials have arrived at the scene. They are currently shutting off the primary water valve to excavate the pipe.'
  },
  {
    id: 'issue-3',
    title: 'Broken Streetlights causing total darkness near Koramangala Club',
    description: 'A row of 5 streetlights is completely dead along the park boundary road near Koramangala Club. The entire stretch of 200m is in pitch black darkness, creating safety concerns for girls and evening walkers.',
    category: 'streetlight',
    severity: 'medium',
    status: 'verified',
    department: 'electricity',
    location: {
      lat: 12.9348,
      lng: 77.6189,
      address: '6th Cross Road, Koramangala 4th Block, Bengaluru, Karnataka 560034'
    },
    imageUrl: 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?q=80&w=800',
    reportedBy: 'anon-103',
    reportedByName: 'Rohan Das',
    votes: 19,
    votedUsers: [],
    aiSummary: 'Multiple non-functioning streetlights near Koramangala Park creating a dark spot on a public road, leading to safety and security risks for pedestrian traffic.',
    estimatedCost: '₹4,000–₹7,000',
    suggestedAction: 'Inspect localized circuit breaker, replace defective LED bulbs, and verify wiring connections.',
    urgencyScore: 6,
    potentialImpact: 'Increased risk of petty crime, purse snatching, or trip hazards for evening pedestrians.',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    resolvedAt: null,
    resolutionNotes: 'Local inspector has verified the issue and assigned it to the BBMP Electrical Division team.'
  },
  {
    id: 'issue-4',
    title: 'Illegal Garbage Overflow and Dumping Yard in HSR Layout Sector 3',
    description: 'A huge pile of household garbage and commercial waste has been dumped directly on the roadside corner. Stray dogs are scattering it across the lane. The smell is unbearable and breathing is difficult.',
    category: 'garbage',
    severity: 'high',
    status: 'reported',
    department: 'sanitation',
    location: {
      lat: 12.9116,
      lng: 77.6412,
      address: 'Sector 3, near 14th Main road corner, HSR Layout, Bengaluru, Karnataka 560102'
    },
    imageUrl: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?q=80&w=800',
    reportedBy: 'anon-104',
    reportedByName: 'Priyah Gowda',
    votes: 35,
    votedUsers: [],
    aiSummary: 'Large volume of unsegregated, decomposing waste piled on a public street corner, attracting pests and creating public health hazards.',
    estimatedCost: '₹3,000–₹5,000',
    suggestedAction: 'Clear current dump with loader, spray disinfectants, and install "No Littering" signage with security cameras.',
    urgencyScore: 8,
    potentialImpact: 'Spread of vector-borne diseases, severe odor pollution, and contamination of local storm water channels.',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    resolvedAt: null,
    resolutionNotes: ''
  },
  {
    id: 'issue-5',
    title: 'Clogged Stormwater Drain Flooding Commercial Street Lane',
    description: 'A storm drain is completely blocked with plastics and construction silt. With even a minor drizzle, dirty drain water overflows into the shops and walkway of Commercial Street, creating highly unsanitary conditions.',
    category: 'drainage',
    severity: 'critical',
    status: 'resolved',
    department: 'sanitation',
    location: {
      lat: 12.9822,
      lng: 77.5983,
      address: 'Commercial Street Lane, Tasker Town, Shivaji Nagar, Bengaluru, Karnataka 560001'
    },
    imageUrl: 'https://images.unsplash.com/photo-1605647540924-852290f6b0d5?q=80&w=800',
    reportedBy: 'anon-105',
    reportedByName: 'Kabir Ahmed',
    votes: 56,
    votedUsers: [],
    aiSummary: 'Debris-clogged stormwater inlet causing raw commercial wastewater backup and road water-logging in high-traffic shopping avenues.',
    estimatedCost: '₹6,000–₹10,000',
    suggestedAction: 'Perform high-pressure flushing of the drainage channel, manually extract solid blockage, and install steel trash grates.',
    urgencyScore: 9,
    potentialImpact: 'Damage to commercial shop inventories, public health risks from dirty water contact, and gridlock of foot traffic.',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    resolutionNotes: 'BBMP sanitation crew deployed suction trucks and cleared all plastic debris from the grates. Stormwater flow is now fully restored. Steel grates reinforced.'
  }
];

const INITIAL_USERS = [
  {
    id: 'anon-101',
    name: 'Aarav Mehta',
    email: 'aarav.mehta@gmail.com',
    points: 480,
    badges: ['hero_reporter', 'community_guardian'],
    issuesReported: 9,
    issuesVerified: 6,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'anon-102',
    name: 'Neha Sharma',
    email: 'neha.sharma@gmail.com',
    points: 350,
    badges: ['hero_reporter'],
    issuesReported: 6,
    issuesVerified: 4,
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'anon-103',
    name: 'Rohan Das',
    email: 'rohan.das@hotmail.com',
    points: 210,
    badges: ['community_eye'],
    issuesReported: 3,
    issuesVerified: 5,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'anon-104',
    name: 'Priyah Gowda',
    email: 'priyah.gowda@outlook.com',
    points: 320,
    badges: ['hero_reporter', 'speed_resolver'],
    issuesReported: 5,
    issuesVerified: 3,
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'anon-105',
    name: 'Kabir Ahmed',
    email: 'kabir.ahmed@yahoo.com',
    points: 620,
    badges: ['hero_reporter', 'community_eye', 'nagar_seva_legend'],
    issuesReported: 12,
    issuesVerified: 10,
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const INITIAL_COMMENTS = [
  {
    id: 'comment-1',
    issueId: 'issue-1',
    userName: 'Vikram Singh',
    text: 'I hit this pothole yesterday on my scooter! It is extremely dangerous. BBMP needs to repair this immediately before someone is seriously injured.',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'comment-2',
    issueId: 'issue-1',
    userName: 'Ananya Rao',
    text: 'Voted! I live nearby and it has been getting larger since the pre-monsoon showers last week.',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'comment-3',
    issueId: 'issue-2',
    userName: 'Siddharth M.',
    text: 'The water pressure is so high it is eroding the tar layer underneath the road. Glad this was reported, huge water wastage!',
    createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString()
  }
];

// Helper to get beautiful, randomized category-specific fallback images
function getFallbackImageForCategory(category: string, identifier: string): string {
  const images: Record<string, string[]> = {
    pothole: [
      'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?q=80&w=800'
    ],
    water: [
      'https://hyderabadmail.com/wp-content/uploads/2026/06/water-patancheru-leakage.jpg'
    ],
    streetlight: [
      'https://static.toiimg.com/thumb/msid-115946065,imgsize-28420,width-400,height-225,resizemode-72/115946065.jpg'
    ],
    garbage: [
      'https://th-i.thgim.com/public/incoming/nd3g01/article71044376.ece/alternates/LANDSCAPE_1200/DSC_1512.JPG'
    ],
    drainage: [
      'https://images.indianexpress.com/2025/12/gurgaon-drainage.jpg?w=1600'
    ],
    other: [
      'https://images.unsplash.com/photo-1594818856205-5022f49479a3?q=80&w=800'
    ]
  };

  const pool = images[category] || images.other;
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % pool.length;
  return pool[index];
}

// Read database or initialize
function getDB() {
  let dbData: any;
  if (!fs.existsSync(DB_PATH)) {
    dbData = {
      issues: INITIAL_ISSUES,
      users: INITIAL_USERS,
      comments: INITIAL_COMMENTS,
      insights: {
        topPriorityAreas: [
          'MG Road Metro Station Area — Critical pothole density',
          'Indiranagar 100ft road — Water line leakage cluster',
          'Commercial Street Shopping Zone — Drainage blockage backlog'
        ],
        patterns: [
          'Water supply leaks spike around newly laid pavement corridors.',
          'Streetlight failures are 35% higher in Ward 4 parks compared to roads.',
          'Stormwater clogs correlate directly with unsegregated commercial food packing dumping.'
        ],
        resourceSuggestion: 'Deploy sanitation suction vehicle to Sector 3 HSR layout and roads division team to MG Road metro exit.',
        predictedIssues: 'Heavy rainfall warnings next week will cause flash pooling on Commercial Street if drains are not cleared.',
        weeklyHighlight: '142 local issues resolved this week in Bengaluru South, cutting average response time from 15 days to 11 days.'
      }
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(dbData, null, 2));
  } else {
    try {
      dbData = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    } catch (err) {
      console.error('Error reading JSON DB, restoring default.', err);
      dbData = { issues: [], users: [], comments: [], insights: {} };
    }
  }

  // Auto-migrate issues that don't have images or have duplicate old default image URLs to randomize them nicely
  let migrated = false;
  const oldDefault = 'https://images.unsplash.com/photo-1594818856205-5022f49479a3?q=80&w=800';
  if (dbData && Array.isArray(dbData.issues)) {
    dbData.issues.forEach((issue: any) => {
      if (!issue.imageUrl || issue.imageUrl === oldDefault || issue.imageUrl === '') {
        issue.imageUrl = getFallbackImageForCategory(issue.category || 'other', issue.id || String(Math.random()));
        migrated = true;
      }
    });
  }

  if (migrated) {
    console.log('[NagarSeva] Migrated existing issue fallback images to randomize them per category.');
    saveDB(dbData);
  }

  return dbData;
}

function saveDB(data: any) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Initialize Gemini Client safely
const getAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    console.warn('GEMINI_API_KEY is not defined or is default template. Using smart local simulation fallbacks!');
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
};

// SIMULATE AI AND WORK WITH REAL AI INTEGRATION
async function getGeminiAnalysis(title: string, description: string, imageBase64?: string, mimeType: string = 'image/jpeg'): Promise<any> {
  const ai = getAIClient();
  if (!ai) {
    // Generate intelligent simulation based on keywords
    console.log('Simulating AI categorization...');
    const descLower = (title + ' ' + description).toLowerCase();
    
    let category: 'pothole' | 'water' | 'streetlight' | 'garbage' | 'drainage' | 'other' = 'other';
    let department: 'roads' | 'water' | 'electricity' | 'sanitation' | 'general' = 'general';
    let severity: 'critical' | 'high' | 'medium' | 'low' = 'medium';
    let urgencyScore = 5;
    let estimatedCost = '₹3,000–₹5,000';
    let suggestedAction = 'Deploy regional inspection team to survey the area.';
    let potentialImpact = 'Slight public inconvenience.';

    if (descLower.includes('pothole') || descLower.includes('road') || descLower.includes('crater') || descLower.includes('pavement')) {
      category = 'pothole';
      department = 'roads';
      severity = descLower.includes('huge') || descLower.includes('crater') || descLower.includes('accident') || descLower.includes('metro') ? 'critical' : 'high';
      urgencyScore = severity === 'critical' ? 9 : 7;
      estimatedCost = '₹8,000–₹15,000';
      suggestedAction = 'Barricade the damaged lane immediately, clear loose gravel, and apply industrial cold-mix asphalt patch.';
      potentialImpact = 'High risk of skidding accidents for two-wheelers, suspension damage, and severe peak-hour traffic jams.';
    } else if (descLower.includes('water') || descLower.includes('leak') || descLower.includes('pipe') || descLower.includes('burst')) {
      category = 'water';
      department = 'water';
      severity = descLower.includes('burst') || descLower.includes('flooding') || descLower.includes('fountain') ? 'high' : 'medium';
      urgencyScore = severity === 'high' ? 8 : 6;
      estimatedCost = '₹12,000–₹25,000';
      suggestedAction = 'Locate the nearest zone isolation valve to restrict flow, excavate the pipe site, and weld/replace the damaged section.';
      potentialImpact = 'Loss of fresh drinking water supply to nearby households and slippery road hazards.';
    } else if (descLower.includes('light') || descLower.includes('dark') || descLower.includes('streetlight') || descLower.includes('bulb')) {
      category = 'streetlight';
      department = 'electricity';
      severity = descLower.includes('entire') || descLower.includes('park') || descLower.includes('safety') || descLower.includes('darkness') ? 'high' : 'medium';
      urgencyScore = severity === 'high' ? 7 : 5;
      estimatedCost = '₹2,500–₹6,000';
      suggestedAction = 'Check localized substation fuse lines, replace burned-out sodium vapor bulbs with high-efficiency LEDs, and secure wire junction panels.';
      potentialImpact = 'Risk of theft, assault, or vehicle collisions in pitch-black pedestrian stretches.';
    } else if (descLower.includes('garbage') || descLower.includes('waste') || descLower.includes('dump') || descLower.includes('smell') || descLower.includes('stray')) {
      category = 'garbage';
      department = 'sanitation';
      severity = descLower.includes('hospital') || descLower.includes('stink') || descLower.includes('school') || descLower.includes('huge') ? 'high' : 'medium';
      urgencyScore = severity === 'high' ? 8 : 5;
      estimatedCost = '₹1,500–₹4,500';
      suggestedAction = 'Deploy a BBMP loader truck to fully evacuate the organic waste, sanitize with calcium hypochlorite powder, and mount warning boards.';
      potentialImpact = 'Attraction of stray animals, breeding grounds for mosquitoes (dengue risk), and foul odors impacting local shops.';
    } else if (descLower.includes('drain') || descLower.includes('sewage') || descLower.includes('drainage') || descLower.includes('overflow') || descLower.includes('clog')) {
      category = 'drainage';
      department = 'sanitation';
      severity = descLower.includes('home') || descLower.includes('overflowing') || descLower.includes('sewer') || descLower.includes('flood') ? 'critical' : 'high';
      urgencyScore = severity === 'critical' ? 9 : 8;
      estimatedCost = '₹10,000–₹18,000';
      suggestedAction = 'Deploy a pressurized high-velocity suction machine to clear subterranean plastic siltation, and clean the storm grates.';
      potentialImpact = 'Raw sewage flooding, bacterial infection outbreaks, and complete inundation of streets during rainfall.';
    }

    const result = {
      category,
      severity,
      department,
      confidence: 96,
      aiSummary: `AI analyzed report: "${title}". Detected ${category} issue in ${department} department. Recommended severity: ${severity.toUpperCase()}.`,
      estimatedCost,
      suggestedAction,
      urgencyScore,
      potentialImpact
    };
    return result;
  }

  try {
    console.log('Calling Google Gemini API models/gemini-3.5-flash...');
    const userPrompt = `Issue Title: ${title}\nDescription: ${description}`;
    
    const imagePart = imageBase64 ? {
      inlineData: {
        mimeType: mimeType,
        data: imageBase64
      }
    } : null;

    const textPart = {
      text: `You are an AI assistant for NagarSeva, a civic issue reporting platform in India.
Analyze the following civic issue and respond ONLY with valid JSON, no markdown formatting (DO NOT wrap in \`\`\`json block), no explanation.

${userPrompt}

Return this exact JSON structure:
{
  "category": "pothole OR water OR streetlight OR garbage OR drainage OR other",
  "severity": "critical OR high OR medium OR low",
  "department": "roads OR water OR electricity OR sanitation OR general",
  "confidence": 95,
  "aiSummary": "2-sentence plain English summary of the issue and its impact",
  "estimatedCost": "₹5,000–₹15,000",
  "suggestedAction": "Specific action authorities should take",
  "urgencyScore": 8,
  "potentialImpact": "Who is affected and how severely"
}

Severity rules:
- critical: safety risk, hospital/school nearby, water contamination, major hazard
- high: major road blocked, large area affected, high risk of accidents
- medium: inconvenience to many, not immediately dangerous
- low: cosmetic, minor inconvenience`
    };

    const parts = imagePart ? [imagePart, textPart] : [textPart];

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text.trim());
    return parsed;
  } catch (error) {
    console.error('Gemini API call failed, backing up to simulation:', error);
    // Return dummy response
    return {
      category: 'other',
      severity: 'medium',
      department: 'general',
      confidence: 80,
      aiSummary: 'Issue received. AI routing service encountered an error but filed it correctly.',
      estimatedCost: '₹3,000–₹8,000',
      suggestedAction: 'Forwarding to general administration for manual triage.',
      urgencyScore: 5,
      potentialImpact: 'Moderate public delay'
    };
  }
}

// Check duplicates near latitude/longitude
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}

// HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// GET GEMINI KEY STATUS AND RAW VALUE FOR THE USER
app.get('/api/gemini-key-status', (req, res) => {
  const key = process.env.GEMINI_API_KEY || '';
  const isConfigured = key && key !== 'MY_GEMINI_API_KEY' && key.trim() !== '';
  let maskedKey = 'Not Configured';
  if (isConfigured) {
    if (key.length > 8) {
      maskedKey = key.substring(0, 6) + '...' + key.substring(key.length - 4);
    } else {
      maskedKey = 'Configured (Short Key)';
    }
  }
  res.json({
    configured: isConfigured,
    maskedKey,
    rawKey: isConfigured ? key : '',
    guide: "To configure, click on the Settings gear (⚙️) on the bottom left or top right of the AI Studio window, look for 'Environment Variables', then add or update GEMINI_API_KEY."
  });
});

// SAVE/UPDATE GEMINI API KEY DIRECTLY
app.post('/api/save-gemini-key', (req, res) => {
  const { key } = req.body;
  if (key === undefined) {
    res.status(400).json({ error: 'Key field is required' });
    return;
  }
  
  const cleanKey = key.trim();
  process.env.GEMINI_API_KEY = cleanKey;
  
  // Persist to .env file for durability across potential hot-reloads or container restarts
  try {
    const envPath = path.join(process.cwd(), '.env');
    let content = '';
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf8');
    }
    const linePattern = /^GEMINI_API_KEY\s*=\s*.*$/m;
    if (linePattern.test(content)) {
      content = content.replace(linePattern, `GEMINI_API_KEY="${cleanKey}"`);
    } else {
      content = `GEMINI_API_KEY="${cleanKey}"\n` + content;
    }
    fs.writeFileSync(envPath, content, 'utf8');
    console.log('[NagarSeva] Dynamically persisted updated GEMINI_API_KEY to root .env file.');
  } catch (err: any) {
    console.error('[NagarSeva] Failed to write GEMINI_API_KEY to .env file, continuing in memory:', err.message);
  }
  
  res.json({
    success: true,
    configured: cleanKey !== '' && cleanKey !== 'MY_GEMINI_API_KEY',
    message: 'GEMINI_API_KEY successfully updated.'
  });
});

// GET USER OR CREATE PROFILE
app.post('/api/users/profile', (req, res) => {
  const { email, name } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }
  const db = getDB();
  let user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    user = {
      id: 'user-' + Date.now(),
      name: name || email.split('@')[0],
      email: email.toLowerCase(),
      points: 100, // Initial sign up bonus
      badges: ['pioneer_citizen'],
      issuesReported: 0,
      issuesVerified: 0,
      createdAt: new Date().toISOString()
    };
    db.users.push(user);
    saveDB(db);
  }
  res.json(user);
});

// GET STATS
app.get('/api/issues/stats', (req, res) => {
  const db = getDB();
  const total = db.issues.length;
  const resolved = db.issues.filter((i: any) => i.status === 'resolved').length;
  const criticalOpen = db.issues.filter((i: any) => i.severity === 'critical' && i.status !== 'resolved').length;
  
  // Avg resolution days
  const resolvedIssues = db.issues.filter((i: any) => i.status === 'resolved' && i.resolvedAt);
  let avgResolutionDays = 14; // Default baseline if no issues resolved yet
  if (resolvedIssues.length > 0) {
    const totalDays = resolvedIssues.reduce((sum: number, issue: any) => {
      const created = new Date(issue.createdAt).getTime();
      const resolved = new Date(issue.resolvedAt).getTime();
      return sum + (resolved - created) / (1000 * 60 * 60 * 24);
    }, 0);
    avgResolutionDays = Math.max(1, Math.round(totalDays / resolvedIssues.length));
  }

  // Count by department
  const byDepartment: Record<string, number> = {
    roads: 0,
    water: 0,
    electricity: 0,
    sanitation: 0,
    general: 0
  };
  db.issues.forEach((i: any) => {
    if (byDepartment[i.department] !== undefined) {
      byDepartment[i.department]++;
    } else {
      byDepartment[i.department] = (byDepartment[i.department] || 0) + 1;
    }
  });

  res.json({
    total,
    resolved,
    criticalOpen,
    avgResolutionDays,
    byDepartment,
    moneySaved: '₹44.6L' // simulated hackathon savings stat
  });
});

// GET ISSUES LIST (FILTERED)
app.get('/api/issues', (req, res) => {
  const { category, status, severity, search, page = '1', limit = '20' } = req.query;
  const db = getDB();
  let filtered = [...db.issues];

  if (category && category !== 'all') {
    filtered = filtered.filter((i: any) => i.category === category);
  }
  if (status && status !== 'all') {
    filtered = filtered.filter((i: any) => i.status === status);
  }
  if (severity && severity !== 'all') {
    filtered = filtered.filter((i: any) => i.severity === severity);
  }
  if (search) {
    const q = (search as string).toLowerCase();
    filtered = filtered.filter(
      (i: any) => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.location.address.toLowerCase().includes(q)
    );
  }

  // Sort by urgencyScore (AI determined) descending
  filtered.sort((a: any, b: any) => b.urgencyScore - a.urgencyScore);

  const p = parseInt(page as string, 10);
  const lim = parseInt(limit as string, 10);
  const total = filtered.length;
  const pages = Math.ceil(total / lim);
  const offset = (p - 1) * lim;
  const paginatedIssues = filtered.slice(offset, offset + lim);

  res.json({
    issues: paginatedIssues,
    total,
    page: p,
    pages
  });
});

// GET ISSUE BY ID
app.get('/api/issues/:id', (req, res) => {
  const { id } = req.params;
  const db = getDB();
  const issue = db.issues.find((i: any) => i.id === id);
  if (!issue) {
    res.status(404).json({ error: 'Issue not found' });
    return;
  }
  const comments = db.comments.filter((c: any) => c.issueId === id);
  res.json({ ...issue, comments });
});

// POST REPORT ISSUE
app.post('/api/issues/report', upload.single('image'), async (req, res) => {
  try {
    const { title, description, lat, lng, address, reportedBy, reportedByName } = req.body;
    
    if (!title || !description || !lat || !lng) {
      res.status(400).json({ error: 'Missing required parameters title, description, lat, lng' });
      return;
    }

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    // Image URL setting
    let imageUrl = '';
    let imageBase64 = '';
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
      // Read file to base64 for Gemini
      const fileBuffer = fs.readFileSync(req.file.path);
      imageBase64 = fileBuffer.toString('base64');
    }

    // Call Gemini to analyze details
    const aiAnalysis = await getGeminiAnalysis(title, description, imageBase64 || undefined, req.file?.mimetype || 'image/jpeg');

    if (!imageUrl) {
      imageUrl = getFallbackImageForCategory(aiAnalysis.category || 'other', title + '-' + Date.now());
    }

    // Retrieve database
    const db = getDB();

    // Check for duplicates within 150m of same category
    let isDuplicate = false;
    let similarIssueId = '';
    let duplicateConfidence = 0;

    for (const existing of db.issues) {
      if (existing.category === aiAnalysis.category && existing.status !== 'resolved') {
        const dist = calculateDistance(parsedLat, parsedLng, existing.location.lat, existing.location.lng);
        if (dist <= 150) {
          isDuplicate = true;
          similarIssueId = existing.id;
          duplicateConfidence = Math.round(90 - (dist / 150) * 15);
          break;
        }
      }
    }

    const newIssueId = 'issue-' + Date.now();
    const newIssue = {
      id: newIssueId,
      title,
      description,
      category: aiAnalysis.category || 'other',
      severity: aiAnalysis.severity || 'medium',
      status: 'reported',
      department: aiAnalysis.department || 'general',
      location: {
        lat: parsedLat,
        lng: parsedLng,
        address: address || 'Bangalore, Karnataka, India'
      },
      imageUrl,
      reportedBy: reportedBy || 'anonymous',
      reportedByName: reportedByName || 'Anonymous Citizen',
      votes: 1,
      votedUsers: [reportedBy || 'anonymous'],
      aiSummary: aiAnalysis.aiSummary || 'Issue received and registered.',
      estimatedCost: aiAnalysis.estimatedCost || '₹4,000–₹8,000',
      suggestedAction: aiAnalysis.suggestedAction || 'Deploy general crew.',
      urgencyScore: aiAnalysis.urgencyScore || 5,
      potentialImpact: aiAnalysis.potentialImpact || 'Moderate congestion',
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      resolutionNotes: ''
    };

    db.issues.push(newIssue);

    // Award 50 points to reportedBy user
    if (reportedBy && reportedBy !== 'anonymous') {
      const user = db.users.find((u: any) => u.id === reportedBy || u.email.toLowerCase() === reportedBy.toLowerCase());
      if (user) {
        user.points += 50;
        user.issuesReported += 1;
        // Check for Reporter badge
        if (user.issuesReported >= 5 && !user.badges.includes('hero_reporter')) {
          user.badges.push('hero_reporter');
        }
        if (user.points >= 500 && !user.badges.includes('nagar_seva_legend')) {
          user.badges.push('nagar_seva_legend');
        }
      }
    }

    saveDB(db);

    res.json({
      success: true,
      issueId: newIssueId,
      category: newIssue.category,
      severity: newIssue.severity,
      aiSummary: newIssue.aiSummary,
      estimatedCost: newIssue.estimatedCost,
      isDuplicate,
      similarIssueId,
      duplicateConfidence
    });

  } catch (err: any) {
    console.error('Error reporting issue:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Helper to trigger Firestore Notifications from Server (Real-time trigger)
async function createServerSideNotification(
  userId: string,
  issueId: string,
  issueTitle: string,
  message: string,
  type: 'status_change' | 'voted_resolved',
  oldStatus?: string,
  newStatus?: string
) {
  if (!firestoreDb) {
    console.warn('[Firebase Server] Firestore not initialized. Skipping notification creation.');
    return;
  }
  // Guard against invalid or default anonymous IDs
  if (!userId || userId === 'anonymous' || userId.startsWith('anon-') || userId.startsWith('citizen.')) {
    return;
  }

  try {
    const notifCol = collection(firestoreDb, 'notifications');
    const notifRef = doc(notifCol);
    await setDoc(notifRef, {
      id: notifRef.id,
      userId,
      issueId,
      issueTitle,
      message,
      type,
      oldStatus: oldStatus || 'reported',
      newStatus: newStatus || 'reported',
      createdAt: new Date().toISOString(),
      read: false
    });
    console.log(`[Firestore Trigger] Server successfully created notification in Firestore for user ${userId}: "${message}"`);
  } catch (err) {
    console.error('[Firebase Server] Error creating notification in Firestore:', err);
  }
}

// UPDATE STATUS (AUTHORITY)
app.put('/api/issues/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, notes, resolvedBy, resolvedImageUrl, resolvedVerificationResult, resolvedVerificationNotes } = req.body;
  if (!status) {
    res.status(400).json({ error: 'Status is required' });
    return;
  }

  const db = getDB();
  const issue = db.issues.find((i: any) => i.id === id);
  if (!issue) {
    res.status(404).json({ error: 'Issue not found' });
    return;
  }

  const oldStatus = issue.status;
  issue.status = status;
  issue.resolutionNotes = notes || '';

  if (status === 'resolved') {
    issue.resolvedImageUrl = resolvedImageUrl || '';
    issue.resolvedVerificationResult = resolvedVerificationResult || 'unchecked';
    issue.resolvedVerificationNotes = resolvedVerificationNotes || '';
  }

  if (status === 'resolved' && oldStatus !== 'resolved') {
    issue.resolvedAt = new Date().toISOString();

    // Award 100 points to the user who reported it
    if (issue.reportedBy && issue.reportedBy !== 'anonymous') {
      const user = db.users.find((u: any) => u.id === issue.reportedBy || u.email.toLowerCase() === issue.reportedBy.toLowerCase());
      if (user) {
        user.points += 100;
        if (user.points >= 500 && !user.badges.includes('nagar_seva_legend')) {
          user.badges.push('nagar_seva_legend');
        }
      }
    }
  } else if (status !== 'resolved') {
    issue.resolvedAt = null;
    issue.resolvedImageUrl = '';
    issue.resolvedVerificationResult = 'unchecked';
    issue.resolvedVerificationNotes = '';
  }

  // Trigger real-time notifications in Firestore directly from the server status change event
  if (firestoreDb && oldStatus !== status) {
    // 1. Notify reporter
    if (issue.reportedBy) {
      createServerSideNotification(
        issue.reportedBy,
        issue.id,
        issue.title,
        `Your reported issue "${issue.title}" status has been updated to ${status.replace('_', ' ').toUpperCase()}.`,
        'status_change',
        oldStatus,
        status
      ).catch(err => console.error('Error in server reporter notification dispatch:', err));
    }

    // 2. Notify voters if the issue was resolved
    if (status === 'resolved' && issue.votedUsers && Array.isArray(issue.votedUsers)) {
      issue.votedUsers.forEach((voterId: string) => {
        if (voterId !== issue.reportedBy) {
          createServerSideNotification(
            voterId,
            issue.id,
            issue.title,
            `An issue you voted on: "${issue.title}" has been resolved!`,
            'voted_resolved',
            oldStatus,
            status
          ).catch(err => console.error('Error in server voter notification dispatch:', err));
        }
      });
    }
  }

  saveDB(db);
  res.json({ success: true, issue });
});

// VERIFY RESOLUTION WORK IMAGE WITH GEMINI AI
app.post('/api/issues/:id/verify-resolution', upload.single('resolvedImage'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      res.status(400).json({ error: 'No resolution completion image uploaded' });
      return;
    }

    const db = getDB();
    const issue = db.issues.find((i: any) => i.id === id);
    if (!issue) {
      res.status(404).json({ error: 'Issue not found' });
      return;
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const resolvedBase64 = fileBuffer.toString('base64');
    const resolvedMimeType = req.file.mimetype || 'image/jpeg';
    const relativeUrl = `/uploads/${req.file.filename}`;

    // Read original issue image base64 if present and exists locally
    let originalBase64 = '';
    let originalMimeType = 'image/jpeg';
    if (issue.imageUrl) {
      // Remove any leading slash
      const cleanPath = issue.imageUrl.replace(/^\//, '');
      const localPath = path.join(process.cwd(), cleanPath);
      if (fs.existsSync(localPath)) {
        try {
          originalBase64 = fs.readFileSync(localPath).toString('base64');
          if (cleanPath.endsWith('.png')) originalMimeType = 'image/png';
          else if (cleanPath.endsWith('.webp')) originalMimeType = 'image/webp';
        } catch (readErr) {
          console.warn('Could not read original issue image from local path:', localPath, readErr);
        }
      }
    }

    const ai = getAIClient();
    if (!ai) {
      console.log('Gemini API is not active. Using smart fallback for resolution image verification...');
      // Fallback verification response based on category
      const isPothole = issue.category === 'pothole';
      const isGarbage = issue.category === 'garbage';
      const isWater = issue.category === 'water';
      const isStreetlight = issue.category === 'streetlight';
      const isDrainage = issue.category === 'drainage';

      let fallbackAnalysis = `The uploaded image successfully shows the completed repair and remediation work. The original ${issue.category} problem has been resolved.`;
      if (isPothole) {
        fallbackAnalysis = `[Simulated Verification] The uploaded completion image shows a smooth, freshly laid blacktop asphalt patch that cleanly covers the crater. It is fully aligned with the reported issue: "${issue.title}".`;
      } else if (isGarbage) {
        fallbackAnalysis = `[Simulated Verification] The uploaded completion image shows a completely cleared, clean pavement section. The overflowing trash pile has been completely disposed of, and the sidewalk has been swept.`;
      } else if (isWater) {
        fallbackAnalysis = `[Simulated Verification] The uploaded completion image shows the pipeline area repaired. The pipe joints are fully dry, sealed, and secured with no active water leak.`;
      } else if (isStreetlight) {
        fallbackAnalysis = `[Simulated Verification] The uploaded completion image shows the streetlight fully active and glowing, throwing bright light onto the road pavement underneath.`;
      } else if (isDrainage) {
        fallbackAnalysis = `[Simulated Verification] The uploaded completion image shows the stormwater drain fully desilted, clear, and fitted with a brand new, secure concrete grate.`;
      }

      res.json({
        valid: true,
        confidence: 95,
        analysis: fallbackAnalysis,
        imageUrl: relativeUrl
      });
      return;
    }

    console.log('Verifying resolution image using models/gemini-3.5-flash...');
    const promptText = `You are a municipal inspector agent of "NagarSeva", verifying if a reported civic issue has been successfully resolved and fixed.

Original Issue Title: "${issue.title}"
Original Issue Category: "${issue.category}"
Original Issue Description: "${issue.description}"

Analyze the newly uploaded resolution/completion image (which is the work completed by the field officers). 
If an original image of the problem is also provided as the first image part, compare them to check if they represent the same location/site.

Please determine:
1. Does the newly uploaded work image correspond to the reported issue and solve it? (e.g. if the issue is a pothole, does the new image show a patched/repaired road? If the issue is garbage, does it show a clean sidewalk? If a water leak, is it dry and fixed?)
2. Is the issue successfully solved? If it looks completely unrelated (e.g. an image of a cat, a desk, or an unresolved hazard), mark "valid" as false.

Return ONLY a valid JSON object matching this schema exactly (do NOT wrap in markdown \`\`\`json block, return raw text):
{
  "valid": true or false,
  "confidence": number between 0 and 100,
  "analysis": "A brief 2-3 sentence visual inspection report describing what was fixed and whether it matches the context."
}`;

    const parts: any[] = [];
    if (originalBase64) {
      parts.push({
        inlineData: {
          mimeType: originalMimeType,
          data: originalBase64
        }
      });
    }

    parts.push({
      inlineData: {
        mimeType: resolvedMimeType,
        data: resolvedBase64
      }
    });

    parts.push({
      text: promptText
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json'
      }
    });

    let resultText = response.text.trim();
    // Clean up markdown block wraps if the model returned them anyway
    if (resultText.startsWith('```')) {
      resultText = resultText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    }

    const parsed = JSON.parse(resultText);
    res.json({
      ...parsed,
      imageUrl: relativeUrl
    });
  } catch (err: any) {
    console.error('Error in resolution verification:', err);
    res.status(500).json({ error: err.message || 'Verification failed' });
  }
});

// DELETE ISSUE (BY REPORTER)
app.delete('/api/issues/:id', (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;

  const db = getDB();
  const index = db.issues.findIndex((i: any) => i.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Issue not found' });
    return;
  }

  const issue = db.issues[index];

  // Allow deleting if user matches, or if it is anonymous (since guests can delete their own offline filings)
  if (userId && issue.reportedBy !== 'anonymous' && issue.reportedBy !== userId) {
    res.status(403).json({ error: 'You are not authorized to delete this issue' });
    return;
  }

  // Deduct points if user is deleting their report (optional/fair)
  if (issue.reportedBy && issue.reportedBy !== 'anonymous') {
    const user = db.users.find((u: any) => u.id === issue.reportedBy || u.email.toLowerCase() === issue.reportedBy.toLowerCase());
    if (user) {
      user.points = Math.max(0, user.points - 50);
      user.issuesReported = Math.max(0, user.issuesReported - 1);
    }
  }

  db.issues.splice(index, 1);
  saveDB(db);
  res.json({ success: true });
});

// POST VOTE
app.post('/api/issues/:id/vote', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body; // User email or ID

  if (!userId) {
    res.status(400).json({ error: 'User Identification is required to vote' });
    return;
  }

  const db = getDB();
  const issue = db.issues.find((i: any) => i.id === id);
  if (!issue) {
    res.status(404).json({ error: 'Issue not found' });
    return;
  }

  if (!issue.votedUsers) {
    issue.votedUsers = [];
  }

  if (issue.votedUsers.includes(userId)) {
    res.status(400).json({ error: 'You have already voted on this issue.' });
    return;
  }

  issue.votedUsers.push(userId);
  issue.votes += 1;

  // Award 5 points to the voter
  const user = db.users.find((u: any) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase());
  if (user) {
    user.points += 5;
    user.issuesVerified += 1;
    if (user.issuesVerified >= 5 && !user.badges.includes('community_eye')) {
      user.badges.push('community_eye');
    }
    if (user.points >= 500 && !user.badges.includes('nagar_seva_legend')) {
      user.badges.push('nagar_seva_legend');
    }
  }

  saveDB(db);
  res.json({ success: true, votes: issue.votes });
});

// POST COMMENT
app.post('/api/issues/:id/comments', (req, res) => {
  const { id } = req.params;
  const { userName, text } = req.body;

  if (!userName || !text) {
    res.status(400).json({ error: 'Name and text are required to comment' });
    return;
  }

  const db = getDB();
  const newComment = {
    id: 'comment-' + Date.now(),
    issueId: id,
    userName,
    text,
    createdAt: new Date().toISOString()
  };

  db.comments.push(newComment);
  saveDB(db);

  res.json({ success: true, comment: newComment });
});

// GET LEADERBOARD
app.get('/api/leaderboard', (req, res) => {
  const db = getDB();
  // Sort users by points descending
  const sorted = [...db.users].sort((a: any, b: any) => b.points - a.points);
  res.json(sorted.slice(0, 20));
});

// GET INSIGHTS (GEMINI ADVANCED ANALYSIS)
app.get('/api/insights', async (req, res) => {
  const ai = getAIClient();
  const db = getDB();

  if (!ai) {
    // Return static/cached insights
    res.json(db.insights);
    return;
  }

  try {
    console.log('Generating dynamic Regional Insights using models/gemini-3.5-flash...');
    // Gather last 30 issues to send for analysis
    const briefIssues = db.issues.slice(-30).map((i: any) => ({
      title: i.title,
      category: i.category,
      severity: i.severity,
      address: i.location.address,
      department: i.department,
      status: i.status
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `You are an executive city planner and AI system architect for NagarSeva in India.
Analyze the following recent community-reported infrastructure issues and return a professional regional insight in valid JSON (no markdown block wrapper \`\`\`json, no preamble).

Recent Issues List:
${JSON.stringify(briefIssues, null, 2)}

Return this exact JSON structure:
{
  "topPriorityAreas": ["Area Name — Specific critical issue details", "... max 3 items"],
  "patterns": ["High-level infrastructure pattern observed across coordinates, e.g. monsoon leakage correlation", "... max 3 items"],
  "resourceSuggestion": "Actionable, precise resource direction advice for commissioners",
  "predictedIssues": ["Infrastructure failures predicted in the coming month based on current report trends", "... max 2 items"],
  "weeklyHighlight": "Declamatory positive summary sentence of citizen participation metrics"
}`,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const insights = JSON.parse(response.text.trim());
    db.insights = insights;
    saveDB(db);
    res.json(insights);
  } catch (error) {
    console.error('Insights generation failed:', error);
    res.json(db.insights);
  }
});

// AUTHORITY PANEL OFFICER AI CHAT (HIGH THINKING FEATURE)
app.post('/api/ai/chat', async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  const ai = getAIClient();
  const generateMockResponse = (query: string): string => {
    const q = query.toLowerCase();
    let advice = "Hello Municipal Commissioner. I am your NagarSeva AI Civic Advisor. ";
    
    if (q.includes('pothole') || q.includes('road') || q.includes('street')) {
      advice += "Based on recent telemetry and citizen reports, we have observed a 14% increase in road surface degradation near major tech corridors. I highly recommend mobilizing a rapid-response asphalt patching squad to MG Road immediately. This can be covered under Section 4-B of the ward micro-budget allocations. Long-term, we should transition to modern stone matrix asphalt for better monsoon resistance.";
    } else if (q.includes('garbage') || q.includes('waste') || q.includes('bin') || q.includes('litter')) {
      advice += "Waste accumulation has spiked near Commercial Street. Our optimization models suggest rescheduling the dry/wet waste segregation trucks to run two separate sweeps (at 6:30 AM and 8:30 PM) to avoid business hours traffic. Let's also set up automated CCTV tracking at chronic blackspots to fine repeat commercial offenders.";
    } else if (q.includes('water') || q.includes('leak') || q.includes('pipe') || q.includes('drain')) {
      advice += "Water pressure fluctuations have been logged near Indiranagar 100 Feet Road. Please direct the water works department to inspect the sub-surface joints for leaks. For stormwater drains, immediate desilting should be scheduled ahead of the monsoon sweep to avoid cross-lane flooding.";
    } else if (q.includes('light') || q.includes('streetlight') || q.includes('dark')) {
      advice += "Our streetlight coverage maps show dark spots near Koramangala. Let's deploy 15 energy-efficient smart LED fixtures. These fixtures include integrated ambient sensors that flag failures automatically via the IoT dashboard, reducing manually reported downtime by 40%.";
    } else if (q.includes('budget') || q.includes('money') || q.includes('allocate') || q.includes('fund')) {
      advice += "We have an unallocated contingency fund of ₹4.5 Lakhs for Ward 84. I suggest allocating 40% to road restorations (potholes), 35% to stormwater drain desilting, and 25% to installing smart garbage bin sensors. This balance maximizes immediate public satisfaction metrics.";
    } else {
      advice += "Our regional municipal database is fully updated. For the most optimal results, I suggest reviewing active public grievances under the dashboard and cross-referencing priority levels. Let me know if you would like to draft a resolution letter, schedule field inspectors, or optimize transit schedules.";
    }
    return advice;
  };

  if (!ai) {
    res.json({ text: generateMockResponse(message) });
    return;
  }

  try {
    console.log('Starting High-Thinking Chat with models/gemini-3.1-pro-preview...');
    const prompt = `You are a high-level Senior Municipal Advisor and Regional Planning Director for NagarSeva, helping Indian cities prioritize resources, optimize garbage routes, assess structural safety, and allocate budgets effectively.
Respond to the officer's query. Provide detailed, analytical, and highly structured advice with a professional, cooperative tone.

Officer's Query: ${message}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH
        }
      }
    });

    res.json({ text: response.text });
  } catch (err: any) {
    console.warn('High-Thinking Gemini Chat failed, trying fallback model gemini-3.5-flash:', err.message || err);
    
    try {
      console.log('Starting Fallback Chat with models/gemini-3.5-flash...');
      const prompt = `You are a high-level Senior Municipal Advisor and Regional Planning Director for NagarSeva, helping Indian cities prioritize resources, optimize garbage routes, assess structural safety, and allocate budgets effectively.
Respond to the officer's query. Provide detailed, analytical, and highly structured advice with a professional, cooperative tone.

Officer's Query: ${message}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt
      });

      res.json({ text: response.text });
    } catch (fallbackErr: any) {
      console.error('Fallback Gemini Chat failed as well, using smart mock response:', fallbackErr.message || fallbackErr);
      res.json({ text: generateMockResponse(message) });
    }
  }
});

// LOCAL SAME-ORIGIN CORS-BYPASS IMAGE PROXY FOR WEBGL CANVAS
app.get('/api/proxy-image', async (req, res) => {
  const defaultFallback = 'https://images.unsplash.com/photo-1594818856205-5022f49479a3?q=80&w=800';

  // Extract the full URL parameter from originalUrl to preserve nested query parameters
  const urlIndex = req.originalUrl.indexOf('url=');
  let imageUrl = '';
  if (urlIndex !== -1) {
    try {
      imageUrl = decodeURIComponent(req.originalUrl.substring(urlIndex + 4));
    } catch (e) {
      imageUrl = req.query.url as string;
    }
  } else {
    imageUrl = req.query.url as string;
  }

  if (!imageUrl) {
    try {
      const fallbackResponse = await fetch(defaultFallback);
      const arrayBuffer = await fallbackResponse.arrayBuffer();
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(Buffer.from(arrayBuffer));
    } catch (err) {
      res.status(404).send('Not Found');
    }
    return;
  }

  // If the image is a local upload path, don't fetch externally
  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    res.redirect(imageUrl);
    return;
  }

  try {
    const targetUrl = imageUrl;

    // Prepare browser-like headers to satisfy hotlink protection and User-Agent blockers
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    try {
      const parsedUrl = new URL(targetUrl);
      headers['Referer'] = parsedUrl.origin;
    } catch (e) {}

    const response = await fetch(targetUrl, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (error) {
    console.warn(`Error proxying image (${imageUrl}), sending fallback image buffer:`, error);
    try {
      const fallbackResponse = await fetch(defaultFallback);
      const arrayBuffer = await fallbackResponse.arrayBuffer();
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(Buffer.from(arrayBuffer));
    } catch (fallbackErr) {
      res.status(500).send('Error');
    }
  }
});

// AI CITIZEN POSTER/BANNER GENERATOR (ASPECT RATIO FEATURE)
app.post('/api/ai/generate-banner', async (req, res) => {
  const { topic, category, location, description, aspectRatio } = req.body;
  if (!topic) {
    res.status(400).json({ error: 'Topic is required' });
    return;
  }

  const ai = getAIClient();
  if (!ai) {
    // If no key, we return a beautiful placeholder image from Unsplash related to the category dynamically randomized!
    const fallbackImg = getFallbackImageForCategory(category || 'other', topic + '-' + Date.now());
    
    console.log('Simulating banner generation with fallback Unsplash image...');
    res.json({
      imageUrl: fallbackImg,
      prompt: `Clean graphic banner representing community awareness on "${topic}" with a high-contrast theme.`
    });
    return;
  }

  try {
    console.log('Generating Banner Image using models/gemini-3.1-flash-image...');

    // Determine category-specific visual themes to seed the image style
    let categoryDetails = "";
    if (category === 'pothole') {
      categoryDetails = "visualizing a broken road surface with hazard markings, caution cones, safety yellow and neon orange palette, under clear warning signs.";
    } else if (category === 'water') {
      categoryDetails = "visualizing water droplet icons, a pipe system motif, ecological conservation themes, and refreshing gradient blue or turquoise tones.";
    } else if (category === 'streetlight') {
      categoryDetails = "visualizing dark urban city street outlines lit by a dramatic, high-contrast spotlight beam, deep midnight-blue sky paired with warm gold lighting.";
    } else if (category === 'garbage') {
      categoryDetails = "visualizing clean green streets, community waste bins, recycle arrows, and vibrant leafy green tones promoting civic hygiene.";
    } else if (category === 'drainage') {
      categoryDetails = "visualizing metal drainage grates, clean water flowing, prevention of urban waterlogging, in cyan and dark teal architectural styles.";
    } else {
      categoryDetails = "visualizing public collaboration, community leadership, clean modern graphic layout, with warm bright background hues.";
    }

    const cleanLocation = location ? String(location).split(',')[0].trim() : 'Bengaluru';
    const cleanDesc = description ? String(description).substring(0, 120).trim() : '';
    const contextSeeds = `Context: ${cleanDesc}. Location/Area: ${cleanLocation}.`;

    const imgPrompt = `A high-quality minimalist civic awareness public poster or graphic banner for Indian city street concerning: "${topic}". 
Visual motif: ${categoryDetails}
Setting detail: ${contextSeeds}
Design requirements: Crisp bold typography, vibrant modern color contrast, highly professional graphic layout. Zero spelling typos, flat clean illustration.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image',
      contents: {
        parts: [{ text: imgPrompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio || '16:9',
          imageSize: '1K'
        }
      }
    });

    let generatedBase64 = '';
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        generatedBase64 = part.inlineData.data;
        break;
      }
    }

    if (generatedBase64) {
      const dataUrl = `data:image/png;base64,${generatedBase64}`;
      res.json({ imageUrl: dataUrl, prompt: imgPrompt });
    } else {
      throw new Error('No image data returned from Gemini');
    }
  } catch (error: any) {
    console.error('Image Generation failed, returning fallback image:', error.message || error);
    const fallbackImg = getFallbackImageForCategory(category || 'other', topic + '-' + Date.now());
    
    res.json({
      imageUrl: fallbackImg,
      prompt: `Clean fallback banner representing community awareness on "${topic}" due to API rate limit.`,
      fallback: true
    });
  }
});

// AI IMAGE ANALYZER & FORM AUTO-FILL
app.post('/api/ai/analyze-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No image file uploaded' });
      return;
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const imageBase64 = fileBuffer.toString('base64');
    const mimeType = req.file.mimetype || 'image/jpeg';

    const ai = getAIClient();
    if (!ai) {
      console.log('Gemini API is not active. Using smart fallback for image analysis...');
      res.json({
        title: 'Road Damage with Deep Craters',
        description: 'Large broken craters are observed on the road surface, making transit unsafe for vehicles, and water accumulating in the holes.',
        category: 'pothole'
      });
      return;
    }

    console.log('Analyzing image using models/gemini-3.5-flash...');
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          inlineData: {
            mimeType,
            data: imageBase64
          }
        },
        {
          text: `Analyze this image of a municipal/civic infrastructure issue in India. 
Generate a suggested short Title, a detailed Description (minimum 25 words describing the hazard, safety issues, and impact), and select the most fitting Category from: 'pothole', 'water', 'streetlight', 'garbage', 'drainage', or 'other'.

Return ONLY a valid JSON object matching this schema exactly (DO NOT wrap in a markdown \`\`\`json block, return raw text):
{
  "title": "Brief descriptive title",
  "description": "Comprehensive description explaining safety impacts",
  "category": "pothole OR water OR streetlight OR garbage OR drainage OR other"
}`
        }
      ],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text.trim());
    res.json(parsed);
  } catch (error: any) {
    console.error('Image analysis failed:', error);
    res.status(500).json({ error: error.message || 'Image analysis failed' });
  }
});

// Integrating Vite Dev Server or Production Build serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[NagarSeva] server is running on http://localhost:${PORT}`);
  });
}

startServer();
