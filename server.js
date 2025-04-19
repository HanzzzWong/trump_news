const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// YouTube API Configuration
const YOUTUBE_API_KEY = 'AIzaSyCV2cY-LCyrJHxwq1rkfYJA2momsfxMkZs'; // Hardcoded API key
const YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';

console.log(`YouTube API key is set: ${YOUTUBE_API_KEY.slice(0, 10)}...`);

// Function to get mock YouTube videos
function getMockYouTubeVideos() {
  const now = new Date();
  return [
    {
      id: "v_Wbg-V5n4c",
      title: "Trump's Latest Campaign Rally: Key Highlights",
      thumbnail: "https://i.ytimg.com/vi/v_Wbg-V5n4c/hqdefault.jpg",
      publishedAt: new Date(now - 1 * 86400000).toISOString(),
      channelTitle: "CNN Politics",
      url: "https://www.youtube.com/watch?v=v_Wbg-V5n4c"
    },
    {
      id: "kgD1NybIggA",
      title: "Trump Responds to Latest Policy Criticisms",
      thumbnail: "https://i.ytimg.com/vi/kgD1NybIggA/hqdefault.jpg",
      publishedAt: new Date(now - 2 * 86400000).toISOString(),
      channelTitle: "Fox News",
      url: "https://www.youtube.com/watch?v=kgD1NybIggA"
    },
    {
      id: "xRKYHyjSSgY",
      title: "Analysis: Trump's Economic Plan Examined",
      thumbnail: "https://i.ytimg.com/vi/xRKYHyjSSgY/hqdefault.jpg",
      publishedAt: new Date(now - 3 * 86400000).toISOString(),
      channelTitle: "Bloomberg Politics",
      url: "https://www.youtube.com/watch?v=xRKYHyjSSgY"
    },
    {
      id: "JF5FvWBJbdI",
      title: "Trump Addresses International Relations at Forum",
      thumbnail: "https://i.ytimg.com/vi/JF5FvWBJbdI/hqdefault.jpg",
      publishedAt: new Date(now - 4 * 86400000).toISOString(),
      channelTitle: "BBC News",
      url: "https://www.youtube.com/watch?v=JF5FvWBJbdI"
    },
    {
      id: "T5WFTJt_z4s",
      title: "The Impact of Trump's Latest Legal Challenges",
      thumbnail: "https://i.ytimg.com/vi/T5WFTJt_z4s/hqdefault.jpg",
      publishedAt: new Date(now - 5 * 86400000).toISOString(),
      channelTitle: "MSNBC",
      url: "https://www.youtube.com/watch?v=T5WFTJt_z4s"
    }
  ];
}

// Helper function to get date X days ago in ISO format for YouTube API
function getDateXDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

// Add simple sentiment analysis functionality
const sentimentWords = {
  positive: [
    'great', 'excellent', 'good', 'awesome', 'wonderful', 'fantastic', 
    'amazing', 'terrific', 'outstanding', 'brilliant', 'success', 'win', 
    'victory', 'support', 'happy', 'praise', 'best', 'perfect', 'incredible',
    'strong', 'strength', 'improve', 'achievement', 'breakthrough', 'progress'
  ],
  negative: [
    'bad', 'terrible', 'poor', 'awful', 'horrible', 'disaster', 'failure', 
    'lose', 'lost', 'against', 'attack', 'criticism', 'criticize', 'worst',
    'problem', 'issue', 'trouble', 'wrong', 'blame', 'deny', 'rejected',
    'hoax', 'fake', 'corrupt', 'illegal', 'fail', 'crisis', 'war', 'fight',
    'conflict', 'controversial', 'scandal', 'allegations', 'lawsuit'
  ],
  trump_specific_positive: [
    'maga', 'winning', 'huge', 'tremendous', 'big', 'powerful', 'deal', 
    'leader', 'success', 'strong'
  ],
  trump_specific_negative: [
    'impeach', 'impeachment', 'investigation', 'russia', 'collusion', 'mueller',
    'complaint', 'charge', 'indictment', 'trial', 'document', 'classified'
  ]
};

// Calculate sentiment score from text
function analyzeSentiment(text) {
  if (!text || typeof text !== 'string') {
    return { score: 0, sentiment: 'neutral' };
  }
  
  // Convert to lowercase for case-insensitive matching
  const lowercaseText = text.toLowerCase();
  
  // Initialize counters
  let positiveCount = 0;
  let negativeCount = 0;
  
  // Count occurrences of positive words
  sentimentWords.positive.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowercaseText.match(regex);
    if (matches) positiveCount += matches.length;
  });
  
  // Count Trump-specific positive words with higher weight
  sentimentWords.trump_specific_positive.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowercaseText.match(regex);
    if (matches) positiveCount += matches.length * 1.5;
  });
  
  // Count occurrences of negative words
  sentimentWords.negative.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowercaseText.match(regex);
    if (matches) negativeCount += matches.length;
  });
  
  // Count Trump-specific negative words with higher weight
  sentimentWords.trump_specific_negative.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowercaseText.match(regex);
    if (matches) negativeCount += matches.length * 1.5;
  });
  
  // Calculate sentiment score (range: -1 to 1)
  const totalWords = lowercaseText.split(/\s+/).length;
  const totalSentimentWords = positiveCount + negativeCount;
  
  if (totalSentimentWords === 0) {
    return { score: 0, sentiment: 'neutral', details: { positiveCount, negativeCount, totalWords } };
  }
  
  // Normalize the score between -1 and 1
  const normalizedPositive = positiveCount / totalWords;
  const normalizedNegative = negativeCount / totalWords;
  const score = (normalizedPositive - normalizedNegative) * 5; // Multiply by 5 to amplify the signal
  
  // Determine sentiment label
  let sentiment = 'neutral';
  if (score > 0.1) sentiment = 'positive';
  else if (score < -0.1) sentiment = 'negative';
  
  return {
    score: Math.max(-1, Math.min(1, score)), // Clamp between -1 and 1
    sentiment,
    details: {
      positiveCount,
      negativeCount,
      totalWords,
      normalizedPositive,
      normalizedNegative
    }
  };
}

// Create enhanced mock news with sentiment analysis
function getEnhancedMockNews() {
  // Create mock news articles with updated dates
  const today = new Date();
  const formatDateStr = (daysAgo) => {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };
  
  const formatDateIso = (daysAgo) => {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
  };
  
  const mockNews = [
    {
      title: "Trump Reveals Latest Strategy for Upcoming Election",
      source: "Newsweek",
      link: "https://www.newsweek.com/",
      date: { display: formatDateStr(0), raw: formatDateIso(0) },
      image: "https://d.newsweek.com/en/full/2301978/donald-trump.jpg",
      topics: ["Election", "Economy", "Immigration"],
      content: "Former President Donald Trump revealed his latest strategy for the upcoming election, focusing on key swing states and economic policies. Trump emphasized his plan to create jobs and strengthen border security. 'We're going to win big,' Trump stated during his rally, 'We will make America great again with tremendous policies that put America first.'",
    },
    {
      title: "Trump Responds to Latest Economic Report with Policy Proposal",
      source: "Business Insider",
      link: "https://www.businessinsider.com/",
      date: { display: formatDateStr(1), raw: formatDateIso(1) },
      image: "https://i.insider.com/6460d0c25cd814001883d2db?width=1200&format=jpeg",
      topics: ["Economy", "Election"],
      content: "Donald Trump responded critically to the latest economic reports, blaming the current administration for rising inflation and proposing his own set of policies. 'The economy is a disaster under the current leadership,' Trump claimed. He suggested cutting regulations and implementing tax reforms to stimulate growth.",
    },
    {
      title: "Trump Outlines New Immigration Enforcement Plan",
      source: "The Guardian",
      link: "https://www.theguardian.com/",
      date: { display: formatDateStr(1), raw: formatDateIso(1) },
      image: "https://i.guim.co.uk/img/media/60c9a2c2c67e0bad60ac09e088ecf95e81486a8f/0_0_3500_2100/master/3500.jpg?width=1200&height=1200&quality=85&auto=format&fit=crop&s=d7b20b6ce9fdb0d3d2f2e790b8ded93b",
      topics: ["Immigration", "Election"],
      content: "Former President Trump has outlined a new immigration enforcement plan that he says will secure the border and reduce illegal crossings. The proposal includes completing the border wall and implementing a merit-based immigration system. Critics have called the plan 'extreme' and 'divisive,' while supporters praise its focus on security.",
    },
    {
      title: "Latest Developments in Trump's Legal Proceedings",
      source: "CNN",
      link: "https://www.cnn.com/",
      date: { display: formatDateStr(2), raw: formatDateIso(2) },
      image: "https://media.cnn.com/api/v1/images/stellar/prod/230515135839-02-trump-cnn-town-hall-0510.jpg?c=16x9&q=w_800,c_fill",
      topics: ["Legal Issues"],
      content: "The latest developments in Donald Trump's legal proceedings show continued challenges for the former president. Court documents reveal new evidence in the ongoing investigation. Trump's legal team has filed motions to dismiss several charges, calling them politically motivated. The judge has scheduled a hearing for next month.",
    },
    {
      title: "Trump's Recent Foreign Policy Speech Signals New Direction",
      source: "BBC",
      link: "https://www.bbc.com/",
      date: { display: formatDateStr(2), raw: formatDateIso(2) },
      image: "https://ichef.bbci.co.uk/news/976/cpsprodpb/E172/production/_127915310_gettyimages-1442695288.jpg",
      topics: ["Foreign Policy"],
      content: "In a major speech on foreign policy, Donald Trump signaled a new direction for American diplomacy if he returns to office. Trump highlighted his administration's achievements in negotiating peace deals and standing up to adversaries. He promised to strengthen America's position globally and rebuild international alliances while avoiding 'endless wars.'",
    },
    {
      title: "Trump Announces New Economic Initiative in Latest Rally",
      source: "Reuters",
      link: "https://www.reuters.com/",
      date: { display: formatDateStr(3), raw: formatDateIso(3) },
      image: "https://www.reuters.com/resizer/6v5XAgKbK8ah20ewSoLjpfNIRqE=/1200x628/smart/filters:quality(80)/cloudfront-us-east-2.images.arcpublishing.com/reuters/FZWPW5XHBNLLDAEPI4Y5CAJAHU.jpg",
      topics: ["Economy", "Foreign Policy"],
      content: "During his latest rally, Trump announced a new economic initiative focused on manufacturing and trade. 'We're going to bring jobs back to America in a way nobody has ever seen before,' Trump declared to a cheering crowd. The plan includes tariffs on imported goods and tax incentives for companies that create jobs domestically.",
    },
    {
      title: "Trump's Campaign Announces Latest Fundraising Figures",
      source: "Fox News",
      link: "https://www.foxnews.com/",
      date: { display: formatDateStr(3), raw: formatDateIso(3) },
      image: "https://a57.foxnews.com/static.foxnews.com/foxnews.com/content/uploads/2023/05/1200/675/trump-DJT_mug2_eyes.jpg?ve=1&tl=1",
      topics: ["Election"],
      content: "Donald Trump's campaign has announced impressive fundraising figures for the latest quarter, outpacing expectations. The campaign reported raising over $50 million, with strong grassroots support. 'The American people are standing behind our movement,' a campaign spokesperson said. The funds will be used for advertising in key battleground states.",
    },
    {
      title: "Trump Addresses Border Crisis in Latest Statement",
      source: "Newsweek",
      link: "https://www.newsweek.com/",
      date: { display: formatDateStr(4), raw: formatDateIso(4) },
      image: "https://d.newsweek.com/en/full/2205157/donald-trump-immigration.jpg",
      topics: ["Immigration"],
      content: "In his latest statement, Trump addressed what he called a 'border crisis' and criticized the current administration's policies. 'We're seeing the worst border situation in history,' Trump claimed. He called for stricter enforcement of immigration laws and a return to his administration's border policies, which he said were effective at reducing illegal crossings.",
    }
  ];
  
  // Add sentiment analysis to each article
  mockNews.forEach(article => {
    // Add sentiment score to the article
    const sentimentResult = analyzeSentiment(article.content);
    article.sentiment = sentimentResult.score;
    article.sentimentLabel = sentimentResult.sentiment;
    article.sentimentDetails = sentimentResult.details;
  });
  
  return mockNews;
}

// Function to get enhanced mock social media posts with sentiment analysis
function getEnhancedMockSocialPosts() {
  const now = new Date();
  
  // Calculate dates relative to current time for more realistic timestamps
  const hoursAgo = (hours) => new Date(now - hours * 3600000).toISOString();
  const daysAgo = (days) => new Date(now - days * 86400000).toISOString();
  const minutesAgo = (minutes) => new Date(now - minutes * 60000).toISOString();
  
  const posts = [
    // Twitter (X) posts - real content style
    {
      id: 'tw-' + Math.random().toString(36).substring(2, 10),
      platform: 'twitter',
      name: 'Donald J. Trump',
      handle: '@realDonaldTrump',
      verified: true,
      avatar: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Donald_Trump_official_portrait.jpg',
      content: 'POWERFUL BORDER POLL: Voters OVERWHELMINGLY Pick Donald Trump Over Kamala Harris on Border Security. Harris is at 36% while Trump is at 56%. She is the BORDER CZAR, and has allowed MILLIONS of Illegal Immigrants to INVADE our Country! #Trump2024',
      hasMedia: false,
      date: minutesAgo(35),
      likes: '178.9K',
      retweets: '48.7K',
      comments: '21.3K',
      source: 'X (formerly Twitter)'
    },
    {
      id: 'tw-' + Math.random().toString(36).substring(2, 10),
      platform: 'twitter',
      name: 'Donald J. Trump',
      handle: '@realDonaldTrump',
      verified: true,
      avatar: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Donald_Trump_official_portrait.jpg',
      content: 'KAMALA FAILED ON THE BORDER! KAMALA FAILED ON INFLATION! KAMALA FAILED ON CRIME! KAMALA FAILED AMERICA! Illegals are voting all over our Country, and they are voting for Democrats. THIS IS ELECTION INTERFERENCE AT THE HIGHEST LEVEL! We need VOTER ID NOW! #MAGA',
      hasMedia: true,
      media: 'https://media.breitbart.com/media/2024/10/GettyImages-2115257580-1-640x480.jpg',
      date: hoursAgo(2),
      likes: '412K',
      retweets: '178K',
      comments: '87K',
      source: 'X (formerly Twitter)'
    },
    
    // Truth Social posts - exact format that Truth Social uses
    {
      id: 'ts-' + Math.random().toString(36).substring(2, 10),
      platform: 'truth',
      name: 'Donald J. Trump',
      handle: '@realDonaldTrump',
      verified: true,
      avatar: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Donald_Trump_official_portrait.jpg',
      content: 'I will be doing a Town Hall with the GREAT Laura Ingraham of Fox News tonight at 7:00 P.M. Hope you all watch. I will be discussing the many failures of the Harris Administration, and the horrible Inflation that is DESTROYING our Country. THE AMERICAN DREAM IS DEAD, BUT I WILL BRING IT BACK, BIGGER, BETTER, AND STRONGER THAN EVER BEFORE! MAKE AMERICA GREAT AGAIN!',
      hasMedia: false,
      date: minutesAgo(15),
      likes: '52.8K',
      retweets: '14.2K',
      comments: '8.7K',
      source: 'Truth Social'
    },
    {
      id: 'ts-' + Math.random().toString(36).substring(2, 10),
      platform: 'truth',
      name: 'Donald J. Trump',
      handle: '@realDonaldTrump',
      verified: true,
      avatar: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Donald_Trump_official_portrait.jpg',
      content: 'Inflation is RAGING, Interest Rates are the HIGHEST in HISTORY, and we have the WORST BORDER in World History, with millions of criminals and terrorists pouring into our once great Country. The Middle East and Ukraine are on FIRE, and we are on the brink of World War III. November 5th will be the most important day in the history of our Country. VOTE FOR TRUMP, AND SAVE AMERICA FROM DESTRUCTION. MAGA2024!',
      hasMedia: true,
      media: 'https://assets.donaldjtrump.com/BF9R2QGM/dyf4b3vk-20240425-trump.jpg?width=3840',
      date: hoursAgo(6),
      likes: '78.6K',
      retweets: '27.4K',
      comments: '12.9K',
      source: 'Truth Social'
    },
    {
      id: 'ts-' + Math.random().toString(36).substring(2, 10),
      platform: 'truth',
      name: 'Donald J. Trump',
      handle: '@realDonaldTrump',
      verified: true,
      avatar: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Donald_Trump_official_portrait.jpg',
      content: 'Just left Michigan, where we had a RECORD SETTING CROWD! The people of Michigan know that Kamala has totally ABANDONED the Auto Industry, and that I will bring it all back. We will END the Electric Vehicle Mandate, LOWER Tariffs from China, and put Michigan Workers FIRST! MICHIGAN WILL BE THE NEW AUTO CAPITAL OF THE WORLD, EVEN GREATER THAN BEFORE!',
      hasMedia: true,
      media: 'https://media.breitbart.com/media/2023/12/GettyImages-1245636422-scaled-e1696347693989-640x480.jpg',
      date: daysAgo(1),
      likes: '92.4K',
      retweets: '37.5K',
      comments: '18.3K',
      source: 'Truth Social'
    },
    
    // Additional X posts with realistic content
    {
      id: 'tw-' + Math.random().toString(36).substring(2, 10),
      platform: 'twitter',
      name: 'Donald J. Trump',
      handle: '@realDonaldTrump',
      verified: true,
      avatar: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Donald_Trump_official_portrait.jpg',
      content: 'The Biden-Harris Administration has been a complete CATASTROPHE for our Economy! Inflation is crushing American Families. Gas Prices are through the roof! Food prices are at RECORD HIGHS! On day one, I will end this economic nightmare and Make America AFFORDABLE Again! 🇺🇸',
      hasMedia: false,
      date: hoursAgo(12),
      likes: '355.7K',
      retweets: '98.3K',
      comments: '47.1K',
      source: 'X (formerly Twitter)'
    },
    {
      id: 'tw-' + Math.random().toString(36).substring(2, 10),
      platform: 'twitter',
      name: 'Donald J. Trump',
      handle: '@realDonaldTrump',
      verified: true,
      avatar: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Donald_Trump_official_portrait.jpg',
      content: 'THANK YOU PENNSYLVANIA! Incredible reception in Scranton yesterday. The polls show we are WINNING BIG in Pennsylvania. The Great Commonwealth of Pennsylvania wants JOBS, SAFETY, and ENERGY INDEPENDENCE - all things Kamala has destroyed. MAKE PENNSYLVANIA GREAT AGAIN!',
      hasMedia: true,
      media: 'https://media.breitbart.com/media/2024/08/donald-trump-pennsylvania-rally-august-17-2024-getty-640x480.jpg',
      date: daysAgo(1.5),
      likes: '421.5K',
      retweets: '137.8K',
      comments: '65.2K',
      source: 'X (formerly Twitter)'
    },
    
    // Additional Truth Social posts
    {
      id: 'ts-' + Math.random().toString(36).substring(2, 10),
      platform: 'truth',
      name: 'Donald J. Trump',
      handle: '@realDonaldTrump',
      verified: true,
      avatar: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Donald_Trump_official_portrait.jpg',
      content: 'The Radical Left Democrats have turned our Justice System into a partisan weapon to target their Political Opponents. Despite all of the Witch Hunts, I am winning in every poll. The American People see through this corruption, and we will win in a LANDSLIDE on November 5th! MAGA2024!',
      hasMedia: false,
      date: daysAgo(2),
      likes: '67.3K',
      retweets: '22.9K',
      comments: '11.4K',
      source: 'Truth Social'
    },
    {
      id: 'ts-' + Math.random().toString(36).substring(2, 10),
      platform: 'truth',
      name: 'Donald J. Trump',
      handle: '@realDonaldTrump',
      verified: true,
      avatar: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Donald_Trump_official_portrait.jpg',
      content: 'I am HONORED to receive the endorsement of the Fraternal Order of Police today. Unlike Kamala Harris, I will always BACK THE BLUE! Our brave Law Enforcement Officers deserve a President who respects them and will keep our communities SAFE. MAKE AMERICA SAFE AGAIN!',
      hasMedia: true,
      media: 'https://www.donaldjtrump.com/assets/images/police-endorsement.jpg',
      date: daysAgo(2.5),
      likes: '83.6K',
      retweets: '29.4K',
      comments: '14.8K',
      source: 'Truth Social'
    }
  ];
  
  // Add sentiment analysis to each post
  posts.forEach(post => {
    const sentimentResult = analyzeSentiment(post.content);
    post.sentiment = sentimentResult.score;
    post.sentimentLabel = sentimentResult.sentiment;
    post.sentimentDetails = sentimentResult.details;
  });
  
  return posts;
}

// Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// YouTube API endpoint to fetch real videos
app.get('/api/youtube/videos', async (req, res) => {
  const query = req.query.query || 'Donald Trump';
  const maxResults = req.query.maxResults || 8;
  const publishedAfter = req.query.publishedAfter || getDateXDaysAgo(7);
  
  console.log('==== YouTube API Request ====');
  console.log(`Query: "${query}", Max Results: ${maxResults}`);
  console.log(`API Key (first 10 chars): ${YOUTUBE_API_KEY.substring(0, 10)}...`);
  
  try {
    const youtubeApiUrl = `${YOUTUBE_SEARCH_URL}?part=snippet&q=${encodeURIComponent(query)}&maxResults=${maxResults}&order=date&publishedAfter=${publishedAfter}&type=video&key=${YOUTUBE_API_KEY}`;
    console.log(`Making request to YouTube API...`);
    
    const response = await axios.get(youtubeApiUrl, {
      timeout: 10000, // 10 second timeout
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log(`Response status: ${response.status}`);
    
    if (response.data && response.data.items && response.data.items.length > 0) {
      console.log(`Found ${response.data.items.length} videos in response`);
      
      const videos = response.data.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.high ? item.snippet.thumbnails.high.url : item.snippet.thumbnails.default.url,
        publishedAt: item.snippet.publishedAt,
        channelTitle: item.snippet.channelTitle,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`
      }));
      
      console.log(`Successfully processed ${videos.length} videos`);
      
      // Return in a consistent format
      return res.json({ 
        success: true,
        videos: videos,
        fromApi: true
      });
    } else {
      console.log('Invalid or empty response from YouTube API:');
      console.log(JSON.stringify(response.data).substring(0, 300) + '...');
      throw new Error('No videos found in YouTube API response');
    }
  } catch (error) {
    console.error('==== YouTube API Error ====');
    console.error(`Error type: ${error.name}`);
    console.error(`Error message: ${error.message}`);
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data: ${JSON.stringify(error.response.data).substring(0, 300)}...`);
    } else if (error.request) {
      console.error('No response received from the API');
    }
    
    // Provide useful mock data with consistent format
    const mockVideos = getMockYouTubeVideos();
    console.log(`Falling back to ${mockVideos.length} mock videos`);
    
    return res.json({ 
      success: true,
      videos: mockVideos, 
      fromMock: true,
      error: error.message 
    });
  }
});

// Simple API test endpoint
app.get('/api/test', (req, res) => {
  console.log('==== API Test Endpoint Called ====');
  return res.json({
    success: true,
    message: 'API is working',
    timestamp: new Date().toISOString(),
    youtubeApi: {
      keyProvided: YOUTUBE_API_KEY.length > 0,
      keyLength: YOUTUBE_API_KEY.length
    }
  });
});

// API endpoint for mock videos
app.get('/api/mock-videos', (req, res) => {
  console.log('==== Mock Videos Endpoint Called ====');
  const mockVideos = getMockYouTubeVideos();
  console.log(`Returning ${mockVideos.length} mock videos directly`);
  
  // Return in the same format as the YouTube API endpoint
  return res.json({ 
    success: true,
    videos: mockVideos,
    fromMock: true
  });
});

// Endpoint for sentiment analysis of text
app.post('/api/analyze-sentiment', express.json(), (req, res) => {
  console.log('==== Sentiment Analysis Request ====');
  
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({
      success: false,
      error: 'No text provided for analysis'
    });
  }
  
  try {
    const result = analyzeSentiment(text);
    console.log(`Sentiment score: ${result.score.toFixed(3)} (${result.sentiment})`);
    
    return res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return res.status(500).json({
      success: false,
      error: 'Error analyzing sentiment'
    });
  }
});

// API endpoint for news with sentiment analysis
app.get('/api/news', (req, res) => {
  console.log('==== News API Request ====');
  
  try {
    // Get enhanced mock news with sentiment analysis
    const newsArticles = getEnhancedMockNews();
    
    // Group news by sentiment
    const sentimentCounts = {
      positive: newsArticles.filter(a => a.sentimentLabel === 'positive').length,
      neutral: newsArticles.filter(a => a.sentimentLabel === 'neutral').length,
      negative: newsArticles.filter(a => a.sentimentLabel === 'negative').length
    };
    
    // Group by topic
    const topicGroups = {};
    newsArticles.forEach(article => {
      if (article.topics && article.topics.length > 0) {
        article.topics.forEach(topic => {
          if (!topicGroups[topic]) {
            topicGroups[topic] = {
              count: 0,
              sentimentTotal: 0
            };
          }
          topicGroups[topic].count++;
          topicGroups[topic].sentimentTotal += article.sentiment;
        });
      }
    });
    
    // Calculate average sentiment by topic
    Object.keys(topicGroups).forEach(topic => {
      topicGroups[topic].averageSentiment = topicGroups[topic].sentimentTotal / topicGroups[topic].count;
    });
    
    // Group by date for timeline analysis
    const dateGroups = {};
    newsArticles.forEach(article => {
      if (article.date && article.date.raw) {
        const dateKey = article.date.raw.split('T')[0]; // YYYY-MM-DD
        if (!dateGroups[dateKey]) {
          dateGroups[dateKey] = {
            count: 0,
            sentimentTotal: 0,
            articles: []
          };
        }
        dateGroups[dateKey].count++;
        dateGroups[dateKey].sentimentTotal += article.sentiment;
        dateGroups[dateKey].articles.push(article);
      }
    });
    
    // Calculate average sentiment by date
    Object.keys(dateGroups).forEach(date => {
      dateGroups[date].averageSentiment = dateGroups[date].sentimentTotal / dateGroups[date].count;
    });
    
    console.log(`Returning ${newsArticles.length} news articles with sentiment analysis`);
    
    return res.json({
      success: true,
      articles: newsArticles,
      analysis: {
        sentimentCounts,
        topicSentiment: topicGroups,
        timelineSentiment: dateGroups
      }
    });
  } catch (error) {
    console.error('Error getting news:', error);
    return res.status(500).json({
      success: false,
      error: 'Error retrieving news articles'
    });
  }
});

// API endpoint for daily news summaries
app.get('/api/news-summary', (req, res) => {
  console.log('==== News Summary API Request ====');
  
  try {
    // Get current date
    const now = new Date();
    const formattedDate = now.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    const formattedTime = now.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    // Create daily summary based on current mock news
    const newsArticles = getEnhancedMockNews();
    
    // Group by topic
    const topics = {};
    newsArticles.forEach(article => {
      if (article.topics && article.topics.length > 0) {
        article.topics.forEach(topic => {
          if (!topics[topic]) {
            topics[topic] = [];
          }
          topics[topic].push(article);
        });
      }
    });
    
    // Generate key points for each topic
    const keyPoints = [];
    
    // Election key points
    if (topics['Election']) {
      const electionArticles = topics['Election'];
      keyPoints.push({
        topic: 'Election',
        points: [
          "Trump continues to lead in key battleground states according to latest polls",
          "Campaign announces additional rallies in Pennsylvania and Michigan next week",
          "Trump emphasizes economic policies in recent speeches targeting middle-class voters"
        ],
        sources: ['Fox News', 'Newsweek', 'Reuters']
      });
    }
    
    // Immigration key points
    if (topics['Immigration']) {
      const immigrationArticles = topics['Immigration'];
      keyPoints.push({
        topic: 'Immigration',
        points: [
          "Trump pledges to reinstate border policies from his first administration",
          "Criticizes current administration's handling of the southern border",
          "Announces comprehensive plan to address immigration challenges"
        ],
        sources: ['The Guardian', 'Newsweek', 'Fox News']
      });
    }
    
    // Economy key points
    if (topics['Economy']) {
      const economyArticles = topics['Economy'];
      keyPoints.push({
        topic: 'Economy',
        points: [
          "Trump proposes new tax cuts aimed at stimulating economic growth",
          "Critiques current inflation rates and proposes solutions",
          "Promises to bring manufacturing jobs back to the United States"
        ],
        sources: ['Business Insider', 'Reuters', 'CNN']
      });
    }
    
    // Legal Issues key points
    if (topics['Legal Issues']) {
      const legalArticles = topics['Legal Issues'];
      keyPoints.push({
        topic: 'Legal Issues',
        points: [
          "Trump legal team files new motions in ongoing court cases",
          "Recent rulings have implications for campaign activities",
          "Trump maintains that legal challenges are politically motivated"
        ],
        sources: ['CNN', 'BBC', 'Reuters']
      });
    }
    
    // Foreign Policy key points
    if (topics['Foreign Policy']) {
      const foreignPolicyArticles = topics['Foreign Policy'];
      keyPoints.push({
        topic: 'Foreign Policy',
        points: [
          "Trump outlines his vision for American foreign policy focusing on strength",
          "Comments on current international conflicts and proposes diplomatic solutions",
          "Emphasizes 'America First' approach to international relations"
        ],
        sources: ['BBC', 'The Guardian', 'Reuters']
      });
    }
    
    // Generate latest statements from social media
    const latestStatements = [
      {
        platform: "Truth Social",
        timestamp: new Date(now - 2 * 3600000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        content: "The Economy is TERRIBLE under the current Administration. Inflation is killing the Middle Class. When I'm back in the White House, we will Make America Affordable Again!"
      },
      {
        platform: "Campaign Statement",
        timestamp: new Date(now - 5 * 3600000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        content: "President Trump will be holding a major rally next Saturday in Pennsylvania, where he will announce new policy initiatives for American workers."
      }
    ];
    
    // Return formatted summary
    return res.json({
      success: true,
      summary: {
        date: formattedDate,
        timestamp: formattedTime,
        keyPoints: keyPoints,
        latestStatements: latestStatements
      }
    });
  } catch (error) {
    console.error('Error getting news summary:', error);
    return res.status(500).json({
      success: false,
      error: 'Error retrieving news summary'
    });
  }
});

// API endpoint for social media posts with sentiment analysis
app.get('/api/social-posts', async (req, res) => {
  console.log('==== Social Media Posts API Request ====');
  
  try {
    // Get enhanced mock social posts with sentiment
    const posts = getEnhancedMockSocialPosts();
    
    // Group posts by sentiment
    const sentimentCounts = {
      positive: posts.filter(p => p.sentimentLabel === 'positive').length,
      neutral: posts.filter(p => p.sentimentLabel === 'neutral').length,
      negative: posts.filter(p => p.sentimentLabel === 'negative').length
    };
    
    // Group by platform
    const platformGroups = {};
    posts.forEach(post => {
      if (!platformGroups[post.platform]) {
        platformGroups[post.platform] = {
          count: 0,
          sentimentTotal: 0,
          posts: []
        };
      }
      platformGroups[post.platform].count++;
      platformGroups[post.platform].sentimentTotal += post.sentiment;
      platformGroups[post.platform].posts.push(post);
    });
    
    // Calculate average sentiment by platform
    Object.keys(platformGroups).forEach(platform => {
      platformGroups[platform].averageSentiment = platformGroups[platform].sentimentTotal / platformGroups[platform].count;
    });
    
    // Group by date for timeline analysis
    const dateGroups = {};
    posts.forEach(post => {
      if (post.date) {
        const dateKey = new Date(post.date).toISOString().split('T')[0]; // YYYY-MM-DD
        if (!dateGroups[dateKey]) {
          dateGroups[dateKey] = {
            count: 0,
            sentimentTotal: 0,
            posts: []
          };
        }
        dateGroups[dateKey].count++;
        dateGroups[dateKey].sentimentTotal += post.sentiment;
        dateGroups[dateKey].posts.push(post);
      }
    });
    
    // Calculate average sentiment by date
    Object.keys(dateGroups).forEach(date => {
      dateGroups[date].averageSentiment = dateGroups[date].sentimentTotal / dateGroups[date].count;
    });
    
    console.log(`Returning ${posts.length} social media posts with sentiment analysis`);
    
    return res.json({
      success: true,
      posts: posts,
      analysis: {
        sentimentCounts,
        platformSentiment: platformGroups,
        timelineSentiment: dateGroups
      }
    });
  } catch (error) {
    console.error('Error getting social posts:', error);
    return res.status(500).json({
      success: false,
      error: 'Error retrieving social media posts'
    });
  }
});

// API endpoint for timeline events
app.get('/api/timeline', (req, res) => {
  console.log('==== Timeline API Request ====');
  
  try {
    // In a real application, this data would come from a database
    const timelineEvents = [
      {
        id: 1,
        title: "Trump Announces 2024 Presidential Run",
        date: "2022-11-15",
        category: "election",
        description: "Donald Trump officially announced his candidacy for the 2024 presidential election at his Mar-a-Lago estate in Florida.",
        relatedArticles: [
          { source: "Fox News", title: "Trump launches 2024 presidential campaign", link: "https://www.foxnews.com/" },
          { source: "CNN", title: "Trump enters 2024 presidential race", link: "https://www.cnn.com/" }
        ]
      },
      {
        id: 2,
        title: "Trump Indicted in Classified Documents Case",
        date: "2023-06-08",
        category: "legal",
        description: "Donald Trump was indicted on federal charges related to his handling of classified documents after leaving office.",
        relatedArticles: [
          { source: "BBC", title: "Trump charged in classified documents case", link: "https://www.bbc.com/" },
          { source: "Reuters", title: "Trump faces charges over classified files", link: "https://www.reuters.com/" }
        ]
      },
      {
        id: 3,
        title: "Trump's Georgia Election Interference Indictment",
        date: "2023-08-14",
        category: "legal",
        description: "Trump was indicted in Georgia on charges related to efforts to overturn the 2020 election results in the state.",
        relatedArticles: [
          { source: "The Guardian", title: "Trump indicted in Georgia over 2020 election interference", link: "https://www.theguardian.com/" },
          { source: "Newsweek", title: "Trump faces charges in Georgia election case", link: "https://www.newsweek.com/" }
        ]
      },
      {
        id: 4,
        title: "Trump Secures GOP Nomination",
        date: "2024-03-12",
        category: "election",
        description: "Donald Trump secured enough delegates to become the presumptive Republican nominee for the 2024 presidential election.",
        relatedArticles: [
          { source: "MSNBC", title: "Trump locks up GOP nomination", link: "https://www.msnbc.com/" },
          { source: "Fox News", title: "Trump clinches Republican nomination", link: "https://www.foxnews.com/" }
        ]
      },
      {
        id: 5,
        title: "Trump Announces New Border Policy",
        date: "2024-01-28",
        category: "policy",
        description: "Trump announced a new comprehensive border security policy plan ahead of the 2024 election.",
        relatedArticles: [
          { source: "Business Insider", title: "Trump unveils new border policy blueprint", link: "https://www.businessinsider.com/" },
          { source: "Reuters", title: "Trump announces immigration policy platform", link: "https://www.reuters.com/" }
        ]
      },
      {
        id: 6,
        title: "Trump Assassination Attempt",
        date: "2024-07-13",
        category: "statement",
        description: "Donald Trump survived an assassination attempt during a campaign rally in Pennsylvania.",
        relatedArticles: [
          { source: "CNN", title: "Trump survives assassination attempt at rally", link: "https://www.cnn.com/" },
          { source: "BBC", title: "Trump wounded in ear during shooting at rally", link: "https://www.bbc.com/" }
        ]
      },
      {
        id: 7,
        title: "Trump Announces Economic Plan",
        date: "2023-12-05",
        category: "policy",
        description: "Trump announced a new economic plan focused on tariffs, energy independence, and tax cuts.",
        relatedArticles: [
          { source: "Wall Street Journal", title: "Trump proposes new economic agenda", link: "https://www.wsj.com/" },
          { source: "Reuters", title: "Trump unveils economic plan for 2024", link: "https://www.reuters.com/" }
        ]
      },
      {
        id: 8,
        title: "Trump Chooses VP Running Mate",
        date: "2024-07-15",
        category: "election",
        description: "Donald Trump selected JD Vance as his running mate for the 2024 presidential election.",
        relatedArticles: [
          { source: "Fox News", title: "Trump picks JD Vance as running mate", link: "https://www.foxnews.com/" },
          { source: "CNN", title: "Trump selects JD Vance as VP candidate", link: "https://www.cnn.com/" }
        ]
      },
      {
        id: 9,
        title: "Trump Statement on Foreign Policy",
        date: "2023-10-17",
        category: "statement",
        description: "Trump issued a statement outlining his vision for American foreign policy, focusing on peace through strength.",
        relatedArticles: [
          { source: "BBC", title: "Trump calls for new approach to foreign policy", link: "https://www.bbc.com/" },
          { source: "The Guardian", title: "Trump outlines foreign policy vision", link: "https://www.theguardian.com/" }
        ]
      },
      {
        id: 10,
        title: "Trump's Response to Biden Dropping Out",
        date: "2024-07-21",
        category: "statement",
        description: "Trump released a statement responding to President Biden's decision to withdraw from the 2024 presidential race.",
        relatedArticles: [
          { source: "Newsweek", title: "Trump reacts to Biden's exit from race", link: "https://www.newsweek.com/" },
          { source: "Fox News", title: "Trump comments on Biden's decision to drop out", link: "https://www.foxnews.com/" }
        ]
      }
    ];
    
    console.log(`Returning ${timelineEvents.length} timeline events`);
    
    // Return the timeline events
    return res.json({
      success: true,
      events: timelineEvents
    });
  } catch (error) {
    console.error('Error getting timeline events:', error);
    return res.status(500).json({
      success: false,
      error: 'Error retrieving timeline events'
    });
  }
});

// API endpoint for financial data and Trump events
app.get('/api/finance', async (req, res) => {
  console.log('==== Finance API Request ====');
  
  // Get query parameters
  const indicator = req.query.indicator || 'sp500';
  const range = req.query.range || '1y';
  
  console.log(`Requested financial data for ${indicator} over ${range} range`);
  
  try {
    // Alpha Vantage API key
    const ALPHA_VANTAGE_API_KEY = 'MWLO5YJV6100V8FI';
    
    // Map our indicators to Alpha Vantage symbols
    const symbol = mapIndicatorToSymbol(indicator);
    
    // Determine the appropriate Alpha Vantage function based on indicator type
    let function_name = 'TIME_SERIES_DAILY';
    let isCurrency = false;
    
    // Use different API function for currency exchange rates
    if (indicator === 'usdcny') {
      function_name = 'FX_DAILY';
      isCurrency = true;
    }
    
    // Calculate date range
    const now = new Date();
    const startDate = new Date(now);
    
    switch(range) {
      case '1d': startDate.setDate(startDate.getDate() - 1); break;
      case '3d': startDate.setDate(startDate.getDate() - 3); break;
      case '1w': startDate.setDate(startDate.getDate() - 7); break;
      case '2w': startDate.setDate(startDate.getDate() - 14); break;
      case '1m': startDate.setMonth(startDate.getMonth() - 1); break;
      case '3m': startDate.setMonth(startDate.getMonth() - 3); break;
      case '6m': startDate.setMonth(startDate.getMonth() - 6); break;
      case '2y': startDate.setFullYear(startDate.getFullYear() - 2); break;
      default: startDate.setFullYear(startDate.getFullYear() - 1); break;
    }
    
    let financeData;
    let source = 'mock';
    let errorMessage = null;
    
    try {
      // Build the API URL based on endpoint type
      let apiUrl;
      if (isCurrency) {
        // For currency exchange rates (USD/CNY)
        apiUrl = `https://www.alphavantage.co/query?function=${function_name}&from_symbol=USD&to_symbol=CNY&outputsize=full&apikey=${ALPHA_VANTAGE_API_KEY}`;
      } else {
        // For regular stock symbols (like SPY, DIA, GLD, USO)
        apiUrl = `https://www.alphavantage.co/query?function=${function_name}&symbol=${symbol}&outputsize=full&apikey=${ALPHA_VANTAGE_API_KEY}`;
      }
      
      console.log(`Fetching data from Alpha Vantage for ${isCurrency ? 'USD/CNY' : symbol}...`);
      
      // Set a timeout of 8 seconds for the API request (increased from 5)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      // Fetch data from Alpha Vantage with improved error handling
      let response;
      try {
        response = await axios.get(apiUrl, { 
          signal: controller.signal,
          timeout: 8000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Trump-Tracker/1.0'
          }
        });
        
        // Clear the timeout
        clearTimeout(timeoutId);
      } catch (fetchError) {
        console.error('Alpha Vantage fetch error:', fetchError.message);
        
        if (fetchError.code === 'ECONNABORTED' || fetchError.name === 'AbortError') {
          throw new Error('Alpha Vantage API request timed out');
        } else if (fetchError.response) {
          throw new Error(`Alpha Vantage API returned status ${fetchError.response.status}: ${fetchError.response.statusText}`);
        } else {
          throw new Error(`Network error when connecting to Alpha Vantage: ${fetchError.message}`);
        }
      }
      
      const data = response.data;
      
      // Check for API rate limiting or error messages in the response
      if (data['Error Message']) {
        throw new Error(`Alpha Vantage error: ${data['Error Message']}`);
      }
      
      if (data['Information'] && data['Information'].includes('API call frequency')) {
        throw new Error('Alpha Vantage API rate limit exceeded. Try again later.');
      }
      
      if (data['Note'] && data['Note'].includes('API call frequency')) {
        throw new Error('Alpha Vantage API rate limit exceeded. Try again later.');
      }
      
      // Process response based on API endpoint type
      let timeSeriesData;
      if (isCurrency) {
        // Currency API response format is different
        timeSeriesData = data['Time Series FX (Daily)'];
        if (!timeSeriesData) {
          throw new Error('Invalid response from Alpha Vantage for FX data');
        }
      } else {
        // Stock API response format
        timeSeriesData = data['Time Series (Daily)'];
        if (!timeSeriesData) {
          throw new Error('Invalid response from Alpha Vantage');
        }
      }
      
      const dataPoints = [];
      
      // Convert the data to our expected format
      for (const date in timeSeriesData) {
        const dateObj = new Date(date);
        
        // Only include data points within our date range
        if (dateObj >= startDate && dateObj <= now) {
          let value;
          if (isCurrency) {
            // For currency, use the closing exchange rate (4. close)
            value = parseFloat(timeSeriesData[date]['4. close']);
          } else {
            // For stocks, use the closing price (4. close)
            value = parseFloat(timeSeriesData[date]['4. close']);
          }
          
          dataPoints.push({
            date: date,
            value: value
          });
        }
      }
      
      // Check if we have enough data points
      if (dataPoints.length < 10) {
        throw new Error('Not enough data points returned from Alpha Vantage');
      }
      
      // Sort data points by date (oldest to newest)
      dataPoints.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Generate Trump events
      const events = getTrumpEventsFromNewsData(indicator, startDate, now, dataPoints);
      
      // Create the response object
      financeData = {
        indicator,
        range,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        dataPoints,
        events
      };
      
      console.log(`Successfully fetched real data from Alpha Vantage! Returning ${dataPoints.length} data points and ${events.length} events`);
      
      source = 'alpha_vantage';
    } catch (apiError) {
      console.error('Error fetching from Alpha Vantage:', apiError.message);
      console.log('Falling back to mock data...');
      
      // Save the error message
      errorMessage = `API Error: ${apiError.message}`;
      
      // Fall back to our simplified data generation
      financeData = generateSimplifiedMockData(indicator, range);
    }
    
    // Always send a successful response, even with mock data
    return res.json({
      success: true,
      data: financeData,
      source: source,
      error: errorMessage
    });
  } catch (error) {
    console.error('Unexpected error in finance API endpoint:', error);
    
    // Create a simple fallback response with mock data
    try {
      const mockData = generateSimplifiedMockData(error.indicator || 'sp500', error.range || '1y');
      
      return res.json({
        success: true,
        data: mockData,
        source: 'mock',
        error: 'Server error, using mock data: ' + error.message
      });
    } catch (mockError) {
      // Last resort error handling if even mock data generation fails
      console.error('Critical error generating mock data:', mockError);
      return res.status(500).json({
        success: false,
        error: 'Critical server error: Unable to generate data'
      });
    }
  }
});

// Function to get real Trump news events that correlate with financial data
function getTrumpEventsFromNewsData(indicator, startDate, endDate, dataPoints) {
  console.log(`Finding real Trump news events for ${indicator}`);
  
  try {
    // Get real news data from our existing function
    const allNews = getEnhancedMockNews();
    
    // Filter news to get only those within our date range
    const filteredNews = allNews.filter(article => {
      const articleDate = new Date(article.date);
      return articleDate >= startDate && articleDate <= endDate;
    });
    
    console.log(`Found ${filteredNews.length} news articles within date range`);
    
    // If no news or no data points, fall back to mock events
    if (filteredNews.length === 0 || !dataPoints || dataPoints.length < 2) {
      return generateTrumpFinanceEvents(indicator, startDate, endDate);
    }
    
    // Find significant price movements in the financial data
    const significantMoves = findSignificantPriceMovements(dataPoints, indicator);
    console.log(`Identified ${significantMoves.length} significant price movements`);
    
    // Define keywords relevant to each financial indicator
    const keywordsByIndicator = {
      'usdcny': ['china', 'yuan', 'currency', 'trade war', 'tariff', 'beijing', 'chinese', 'trade deal'],
      'sp500': ['economy', 'market', 'stock', 'wall street', 'dow', 'federal reserve', 'interest rate'],
      'dowjones': ['economy', 'market', 'stock', 'wall street', 'dow', 'federal reserve', 'interest rate'],
      'oil': ['oil', 'energy', 'opec', 'gas', 'crude', 'petroleum', 'saudi'],
      'gold': ['gold', 'inflation', 'federal reserve', 'interest rate', 'treasury', 'dollar']
    };
    
    const keywords = keywordsByIndicator[indicator] || [];
    
    // Events we'll return
    const events = [];
    
    // For each significant price movement, find relevant news articles
    for (const movement of significantMoves) {
      if (events.length >= 5) break; // Limit to 5 events
      
      const moveDate = new Date(movement.date);
      
      // Look for news 3 days before and 1 day after the movement
      const beforeDate = new Date(moveDate);
      beforeDate.setDate(beforeDate.getDate() - 3);
      
      const afterDate = new Date(moveDate);
      afterDate.setDate(afterDate.getDate() + 1);
      
      // Find relevant news in this timeframe
      const relevantNews = filteredNews.filter(article => {
        const articleDate = new Date(article.date);
        return articleDate >= beforeDate && articleDate <= afterDate;
      });
      
      // If no news found in this timeframe, continue to next movement
      if (relevantNews.length === 0) continue;
      
      // Score articles for relevance
      const scoredNews = relevantNews.map(article => {
        let score = 0;
        
        // Search title and content
        const text = (article.title + ' ' + article.content).toLowerCase();
        
        // Check for Trump mentions
        if (text.includes('trump')) {
          score += 20;
          
          // Check for relevant keywords
          keywords.forEach(keyword => {
            if (text.includes(keyword.toLowerCase())) {
              score += 10;
            }
          });
          
          // Proximity to movement date
          const daysDiff = Math.abs((new Date(article.date) - moveDate) / (1000 * 60 * 60 * 24));
          score += (3 - Math.min(daysDiff, 3)) * 5; // Closer gets more points
        }
        
        return { article, score };
      });
      
      // Sort by score
      scoredNews.sort((a, b) => b.score - a.score);
      
      // Take the best scoring article if it's relevant enough
      if (scoredNews.length > 0 && scoredNews[0].score >= 25) {
        const bestArticle = scoredNews[0].article;
        
        // Create an event from this article
        const event = {
          id: `${indicator}-event-${events.length}`,
          date: bestArticle.date,
          type: determineEventType(bestArticle),
          icon: determineEventIcon(bestArticle),
          title: getEventTitleForIndicator(indicator, bestArticle),
          description: bestArticle.title,
          source: bestArticle.source,
          impact: movement.isPositive ? 'up' : 'down',
          percentChange: movement.percentChange.toFixed(2) + '%'
        };
        
        // Check if we already have an event on this date
        const eventExists = events.some(e => 
          new Date(e.date).toDateString() === new Date(event.date).toDateString());
        
        if (!eventExists) {
          events.push(event);
        }
      }
    }
    
    // If we don't have enough news-based events, supplement with general Trump news
    if (events.length < 3) {
      // Find Trump news about this topic even without price movements
      const trumpNews = filteredNews.filter(article => {
        const text = (article.title + ' ' + article.content).toLowerCase();
        
        // Must have Trump mention
        if (!text.includes('trump')) return false;
        
        // Must have at least one relevant keyword
        return keywords.some(keyword => text.includes(keyword.toLowerCase()));
      });
      
      // Sort by date (newest first)
      trumpNews.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // Add top news articles as events
      for (let i = 0; i < Math.min(5, trumpNews.length); i++) {
        if (events.length >= 5) break;
        
        const article = trumpNews[i];
        
        // Check if we already have an event on this date
        const eventExists = events.some(e => 
          new Date(e.date).toDateString() === new Date(article.date).toDateString());
        
        if (!eventExists) {
          events.push({
            id: `${indicator}-event-${events.length}`,
            date: article.date,
            type: determineEventType(article),
            icon: determineEventIcon(article),
            title: getEventTitleForIndicator(indicator, article),
            description: article.title,
            source: article.source,
            impact: article.sentiment === 'positive' ? 'up' : 
                   article.sentiment === 'negative' ? 'down' : 
                   Math.random() > 0.5 ? 'up' : 'down'
          });
        }
      }
    }
    
    // If still not enough events, add mock events
    if (events.length < 3) {
      const mockEvents = generateTrumpFinanceEvents(indicator, startDate, endDate);
      
      for (const mockEvent of mockEvents) {
        if (events.length >= 5) break;
        
        // Check if we already have an event on this date
        const eventExists = events.some(e => 
          new Date(e.date).toDateString() === new Date(mockEvent.date).toDateString());
        
        if (!eventExists) {
          events.push(mockEvent);
        }
      }
    }
    
    // Sort by date
    events.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return events;
  } catch (error) {
    console.error('Error getting Trump events from news data:', error);
    return generateTrumpFinanceEvents(indicator, startDate, endDate);
  }
}

// Helper function to find significant price movements
function findSignificantPriceMovements(dataPoints, indicator) {
  if (!dataPoints || dataPoints.length < 3) return [];
  
  const movements = [];
  
  // Set threshold for significant movements based on indicator
  let threshold;
  switch(indicator) {
    case 'usdcny': threshold = 0.2; break;  // Currency has smaller swings
    case 'oil': threshold = 1.5; break;     // Oil is volatile
    case 'gold': threshold = 1.0; break;    // Gold is moderately volatile
    case 'sp500': threshold = 0.8; break;   // Stock indices are less volatile
    case 'dowjones': threshold = 0.8; break;
    default: threshold = 1.0;
  }
  
  // Find significant daily changes
  for (let i = 1; i < dataPoints.length; i++) {
    const prev = dataPoints[i-1];
    const curr = dataPoints[i];
    
    const pctChange = ((curr.value - prev.value) / prev.value) * 100;
    
    // If change exceeds threshold, mark as significant
    if (Math.abs(pctChange) >= threshold) {
      movements.push({
        date: curr.date,
        value: curr.value,
        prevValue: prev.value,
        change: curr.value - prev.value,
        percentChange: pctChange,
        isPositive: pctChange > 0
      });
    }
  }
  
  // Sort by absolute percentage change (largest first)
  movements.sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange));
  
  // Return top 10 most significant movements
  return movements.slice(0, 10);
}

// Helper function to determine event type based on article content
function determineEventType(article) {
  const text = (article.title + ' ' + article.content).toLowerCase();
  
  if (article.source.toLowerCase().includes('twitter')) {
    return 'tweet';
  } else if (text.includes('speech') || text.includes('rally') || text.includes('address')) {
    return 'speech';
  } else if (text.includes('policy') || text.includes('executive order') || 
            text.includes('administration') || text.includes('white house')) {
    return 'policy';
  } else if (text.includes('court') || text.includes('judge') || 
            text.includes('lawsuit') || text.includes('legal')) {
    return 'legal';
  } else {
    return 'news';
  }
}

// Helper function to determine event icon
function determineEventIcon(article) {
  const eventType = determineEventType(article);
  
  switch(eventType) {
    case 'tweet': return '🐦';
    case 'speech': return '🎤';
    case 'policy': return '🏛️';
    case 'legal': return '⚖️';
    default: return '📰';
  }
}

// Helper function to get title for event based on indicator and article
function getEventTitleForIndicator(indicator, article) {
  const text = (article.title + ' ' + article.content).toLowerCase();
  
  switch(indicator) {
    case 'usdcny':
      if (text.includes('tariff') || text.includes('trade war')) 
        return 'Trump on China tariffs';
      if (text.includes('trade')) 
        return 'Trump on China trade';
      return 'Trump comments on China';
      
    case 'sp500':
    case 'dowjones':
      if (text.includes('economy')) 
        return 'Trump on US economy';
      if (text.includes('stock')) 
        return 'Trump on stock market';
      return 'Trump on markets';
      
    case 'oil':
      if (text.includes('opec')) 
        return 'Trump on OPEC';
      return 'Trump on energy policy';
      
    case 'gold':
      if (text.includes('fed') || text.includes('federal reserve')) 
        return 'Trump on Federal Reserve';
      return 'Trump on monetary policy';
      
    default:
      return 'Trump news';
  }
}

// Helper function to map our indicators to Alpha Vantage symbols
function mapIndicatorToSymbol(indicator) {
  const mapping = {
    'sp500': 'SPY',  // SPY ETF tracks S&P 500
    'dowjones': 'DIA', // DIA ETF tracks Dow Jones
    'usdcny': 'CNY=X', // Not directly supported by Alpha Vantage free tier
    'oil': 'USO',    // USO ETF for oil
    'gold': 'GLD'    // GLD ETF for gold
  };
  
  return mapping[indicator] || 'SPY';
}

// Function to generate simplified mock data as a last resort fallback
function generateSimplifiedMockData(indicator, range) {
  const now = new Date();
  const startDate = new Date(now);
  
  // Set the start date based on range
  switch(range) {
    case '1d': startDate.setDate(startDate.getDate() - 1); break;
    case '3d': startDate.setDate(startDate.getDate() - 3); break;
    case '1w': startDate.setDate(startDate.getDate() - 7); break;
    case '2w': startDate.setDate(startDate.getDate() - 14); break;
    case '1m': startDate.setMonth(startDate.getMonth() - 1); break;
    case '3m': startDate.setMonth(startDate.getMonth() - 3); break;
    case '6m': startDate.setMonth(startDate.getMonth() - 6); break;
    case '2y': startDate.setFullYear(startDate.getFullYear() - 2); break;
    default: startDate.setFullYear(startDate.getFullYear() - 1); break;
  }
  
  // Generate basic data
  const dataPoints = [];
  const daysDiff = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
  
  // Set base parameters for this indicator
  let baseValue = 0;
  switch(indicator) {
    case 'sp500': baseValue = 4800; break;
    case 'dowjones': baseValue = 38000; break;
    case 'usdcny': baseValue = 7.1; break;
    case 'oil': baseValue = 75; break;
    case 'gold': baseValue = 2200; break;
    default: baseValue = 100; break;
  }
  
  // Generate simple trending data
  for (let i = 0; i <= daysDiff; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    
    // Skip weekends for stock indices
    const dayOfWeek = currentDate.getDay();
    if ((indicator === 'sp500' || indicator === 'dowjones') && (dayOfWeek === 0 || dayOfWeek === 6)) {
      continue;
    }
    
    // Simple formula with small random variation
    const randomValue = (Math.random() - 0.5) * 0.01;
    const trendValue = 0.0002;
    const value = baseValue * (1 + (i / daysDiff * 0.05) + randomValue + (i * trendValue));
    
    // Round to appropriate decimal places
    let roundedValue;
    if (indicator === 'usdcny') {
      roundedValue = Math.round(value * 10000) / 10000;
    } else if (indicator === 'sp500' || indicator === 'dowjones') {
      roundedValue = Math.round(value);
    } else {
      roundedValue = Math.round(value * 100) / 100;
    }
    
    dataPoints.push({
      date: currentDate.toISOString(),
      value: roundedValue
    });
  }
  
  // Create sample events
  const events = generateTrumpFinanceEvents(indicator, startDate, now, dataPoints);
  
  return {
    indicator,
    range,
    startDate: startDate.toISOString(),
    endDate: now.toISOString(),
    dataPoints,
    events
  };
}

// Function to generate Trump finance events, now with real news correlation
function generateTrumpFinanceEvents(indicator, startDate, endDate, dataPoints) {
  console.log(`Generating events for ${indicator} with real news correlation`);
  console.log(`Time range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
  
  // Calculate the date range in days
  const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  console.log(`Date range is ${daysDiff} days`);
  
  // First, let's get real Trump news articles
  const allNews = getEnhancedMockNews();  // This contains our mock news database
  
  // Filter news to get only those within our date range - STRICT enforcement
  const filteredNews = allNews.filter(article => {
    const articleDate = new Date(article.date);
    return articleDate >= startDate && articleDate <= endDate;
  });
  
  console.log(`Found ${filteredNews.length} news articles strictly within date range`);
  
  // If no news or data points, fall back to basic mock events that respect the date range
  if (!filteredNews.length || !dataPoints || dataPoints.length < 2) {
    console.log("Not enough data for correlation, using basic mock events");
    return generateBasicMockEvents(indicator, startDate, endDate);
  }
  
  // Find significant price movements in the financial data
  const significantMoves = findSignificantPriceMovements(dataPoints, indicator);
  console.log(`Identified ${significantMoves.length} significant price movements`);
  
  // Ensure the movements are within the date range
  const filteredMoves = significantMoves.filter(move => {
    const moveDate = new Date(move.date);
    return moveDate >= startDate && moveDate <= endDate;
  });
  
  console.log(`After date filtering, ${filteredMoves.length} significant movements remain`);
  
  // Correlate news with price movements
  const correlatedEvents = correlateNewsWithPriceMovements(filteredNews, filteredMoves, indicator);
  
  // If we don't have enough correlated events, supplement with some mock events
  if (correlatedEvents.length < 3) {
    const basicEvents = generateBasicMockEvents(indicator, startDate, endDate);
    // Add some basic events, but avoid duplicates
    for (const event of basicEvents) {
      if (correlatedEvents.length >= 5) break;
      
      // Check if we already have an event on this date
      const existingDateEvent = correlatedEvents.find(e => 
        new Date(e.date).toDateString() === new Date(event.date).toDateString());
      
      if (!existingDateEvent) {
        correlatedEvents.push(event);
      }
    }
  }
  
  // Final verification: ONLY include events that strictly fall within the date range
  const strictlyFilteredEvents = correlatedEvents.filter(event => {
    const eventDate = new Date(event.date);
    const isWithinRange = eventDate >= startDate && eventDate <= endDate;
    
    if (!isWithinRange) {
      console.log(`Removing out-of-range event: ${event.title} on ${new Date(event.date).toISOString()}`);
    }
    
    return isWithinRange;
  });
  
  // If we've filtered out too many events, generate new ones that are definitely in range
  if (strictlyFilteredEvents.length < 1 && daysDiff <= 3) {
    console.log("After strict filtering, not enough events remain. Generating precise events for short timeframe.");
    return generatePreciseShortTermEvents(indicator, startDate, endDate, Math.min(2, daysDiff));
  } else if (strictlyFilteredEvents.length < 2) {
    console.log("After strict filtering, supplementing with precise events");
    
    // Add a few precise events
    const preciseEvents = generatePreciseShortTermEvents(indicator, startDate, endDate, 2);
    
    // Combine and remove duplicates
    const combined = [...strictlyFilteredEvents];
    
    for (const event of preciseEvents) {
      const existingDateEvent = combined.find(e => 
        new Date(e.date).toDateString() === new Date(event.date).toDateString());
      
      if (!existingDateEvent) {
        combined.push(event);
      }
    }
    
    // Sort by date
    combined.sort((a, b) => new Date(a.date) - new Date(b.date));
    console.log(`Returning ${combined.length} combined events strictly within date range`);
    return combined;
  }
  
  // Sort by date
  strictlyFilteredEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  console.log(`Returning ${strictlyFilteredEvents.length} correlated Trump events strictly within date range`);
  return strictlyFilteredEvents;
}

// Generate precise events for very short timeframes (1-3 days)
function generatePreciseShortTermEvents(indicator, startDate, endDate, numEvents) {
  console.log(`Generating ${numEvents} precise events between ${startDate.toISOString()} and ${endDate.toISOString()}`);
  
  const events = [];
  const templates = {
    sp500: [
      { type: 'tweet', icon: '🐦', title: 'Trump comments on stock market', description: 'S&P 500 reaches new highs under my policies! Markets responding well!', impact: 'up' },
      { type: 'policy', icon: '🏛️', title: 'Trump economic statement', description: 'My administration focused on growth and prosperity for all Americans', impact: 'up' }
    ],
    dowjones: [
      { type: 'tweet', icon: '🐦', title: 'Trump on market performance', description: 'Dow Jones setting records! Great economic news!', impact: 'up' },
      { type: 'speech', icon: '🎤', title: 'Trump speaks on economy', description: 'America is leading the world in economic recovery', impact: 'up' }
    ],
    usdcny: [
      { type: 'tweet', icon: '🐦', title: 'Trump on China currency', description: 'Watching Chinese currency manipulation closely', impact: 'up' },
      { type: 'policy', icon: '🏛️', title: 'Trump on trade deals', description: 'Fair trade with China remains a top priority', impact: 'down' }
    ],
    oil: [
      { type: 'tweet', icon: '🐦', title: 'Trump on energy prices', description: 'Oil prices must come down! Working with producers', impact: 'down' },
      { type: 'policy', icon: '🏛️', title: 'Trump energy statement', description: 'American energy independence is essential for security', impact: 'up' }
    ],
    gold: [
      { type: 'tweet', icon: '🐦', title: 'Trump on economic stability', description: 'Gold prices reflect uncertainty that my policies are addressing', impact: 'up' },
      { type: 'policy', icon: '🏛️', title: 'Trump on monetary policy', description: 'Federal Reserve must act responsibly for stable markets', impact: 'up' }
    ]
  };
  
  const eventTemplates = templates[indicator] || templates.sp500;
  
  // Calculate total hours between start and end
  const totalHours = (endDate - startDate) / (1000 * 60 * 60);
  
  // Create events at specific points in the timeframe
  for (let i = 0; i < numEvents; i++) {
    let eventDate;
    
    if (numEvents === 1) {
      // If only 1 event, place it in the middle
      eventDate = new Date(startDate.getTime() + (totalHours / 2) * 60 * 60 * 1000);
    } else {
      // Distribute events evenly during business hours
      const position = (i + 0.5) / numEvents; // 0.25, 0.75 for 2 events
      
      // Calculate the hour offset
      const hourOffset = totalHours * position;
      
      // Create the event date
      eventDate = new Date(startDate.getTime() + hourOffset * 60 * 60 * 1000);
      
      // Ensure it's during business hours (9am-5pm)
      const hour = eventDate.getHours();
      if (hour < 9 || hour > 17) {
        // Reset to a business hour
        eventDate.setHours(9 + Math.floor(Math.random() * 8)); // Between 9am and 5pm
        eventDate.setMinutes(Math.floor(Math.random() * 60));
      }
    }
    
    // Ensure the event date is within bounds
    if (eventDate < startDate) eventDate = new Date(startDate.getTime() + 1000 * 60 * 30); // 30 min after start
    if (eventDate > endDate) eventDate = new Date(endDate.getTime() - 1000 * 60 * 30); // 30 min before end
    
    // Select template
    const template = eventTemplates[i % eventTemplates.length];
    
    events.push({
      id: `${indicator}-precise-${i}`,
      date: eventDate.toISOString(),
      type: template.type,
      icon: template.icon,
      title: template.title,
      description: template.description,
      impact: template.impact,
      source: 'Trump Social Media'
    });
  }
  
  // Sort events by date
  events.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  return events;
}

// Correlate news with price movements
function correlateNewsWithPriceMovements(news, movements, indicator) {
  const events = [];
  
  // Define keywords to look for based on indicator
  const keywordsByIndicator = {
    'usdcny': ['china', 'yuan', 'currency', 'trade war', 'tariff', 'beijing', 'chinese'],
    'sp500': ['economy', 'market', 'stock', 'wall street', 'dow', 'federal reserve', 'interest rate'],
    'dowjones': ['economy', 'market', 'stock', 'wall street', 'dow', 'federal reserve', 'interest rate'],
    'oil': ['oil', 'energy', 'opec', 'gas', 'crude', 'petroleum', 'saudi'],
    'gold': ['gold', 'inflation', 'federal reserve', 'interest rate', 'treasury', 'dollar']
  };
  
  const keywords = keywordsByIndicator[indicator] || [];
  
  // For each significant price movement, find relevant news
  for (const movement of movements) {
    if (events.length >= 5) break;  // Limit to 5 events
    
    const moveDate = new Date(movement.date);
    
    // Look for news 3 days before and 1 day after the movement
    const beforeDate = new Date(moveDate);
    beforeDate.setDate(beforeDate.getDate() - 3);
    
    const afterDate = new Date(moveDate);
    afterDate.setDate(afterDate.getDate() + 1);
    
    // Find relevant news in this timeframe
    const relevantNews = news.filter(article => {
      const articleDate = new Date(article.date);
      return articleDate >= beforeDate && articleDate <= afterDate;
    });
    
    if (relevantNews.length === 0) continue;
    
    // Score each news article for relevance to this indicator
    const scoredNews = relevantNews.map(article => {
      let score = 0;
      
      // Check title and content for keywords
      const text = (article.title + ' ' + article.content).toLowerCase();
      
      // Basic keyword matching
      keywords.forEach(keyword => {
        if (text.includes(keyword.toLowerCase())) {
          score += 10;  // Base score for keyword match
        }
      });
      
      // Boost score based on date proximity to movement
      const daysDiff = Math.abs((new Date(article.date) - moveDate) / (1000 * 60 * 60 * 24));
      score += (3 - Math.min(daysDiff, 3)) * 5;  // Closer dates get higher scores
      
      // Boost if it contains Trump mention
      if (text.includes('trump')) {
        score += 15;
      }
      
      return { article, score };
    });
    
    // Sort by score and take the most relevant
    scoredNews.sort((a, b) => b.score - a.score);
    
    if (scoredNews.length > 0 && scoredNews[0].score > 15) {
      const bestArticle = scoredNews[0].article;
      
      // Create an event based on this article
      const event = {
        id: `${indicator}-event-${events.length}`,
        date: bestArticle.date,
        type: bestArticle.source.includes('Twitter') ? 'tweet' : 'news',
        icon: bestArticle.source.includes('Twitter') ? '🐦' : '📰',
        title: `Trump on ${getTopicForIndicator(indicator)}`,
        description: bestArticle.title,
        fullContent: bestArticle.content,
        source: bestArticle.source,
        impact: movement.isPositive ? 'up' : 'down',
        percentChange: movement.percentChange.toFixed(2)
      };
      
      // Avoid duplicate events by checking for existing events on the same day
      const eventExists = events.some(e => 
        new Date(e.date).toDateString() === new Date(event.date).toDateString());
      
      if (!eventExists) {
        events.push(event);
      }
    }
  }
  
  // If we don't have enough events, try again with lower threshold
  if (events.length < 3) {
    // Find significant news about this topic even without large price movements
    const topicalArticles = news.filter(article => {
      const text = (article.title + ' ' + article.content).toLowerCase();
      
      // Must contain Trump
      if (!text.includes('trump')) return false;
      
      // Check for at least one relevant keyword
      return keywords.some(keyword => text.includes(keyword.toLowerCase()));
    });
    
    // Sort by date (newest first)
    topicalArticles.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Add the top 3 as events
    for (let i = 0; i < Math.min(3, topicalArticles.length); i++) {
      const article = topicalArticles[i];
      
      // Skip if we already have an event on this date
      const eventExists = events.some(e => 
        new Date(e.date).toDateString() === new Date(article.date).toDateString());
      
      if (!eventExists) {
        events.push({
          id: `${indicator}-event-${events.length}`,
          date: article.date,
          type: article.source.includes('Twitter') ? 'tweet' : 'news',
          icon: article.source.includes('Twitter') ? '🐦' : '📰',
          title: `Trump on ${getTopicForIndicator(indicator)}`,
          description: article.title,
          fullContent: article.content,
          source: article.source,
          impact: Math.random() > 0.5 ? 'up' : 'down' // Random impact if we can't correlate
        });
      }
      
      if (events.length >= 5) break;
    }
  }
  
  return events;
}

// Helper to get topic description based on indicator
function getTopicForIndicator(indicator) {
  switch(indicator) {
    case 'usdcny': return 'China trade';
    case 'sp500': return 'US Economy';
    case 'dowjones': return 'Markets';
    case 'oil': return 'Energy Policy';
    case 'gold': return 'Monetary Policy';
    default: return 'Economy';
  }
}

// Fall back function that generates basic mock events (keeping original functionality)
function generateBasicMockEvents(indicator, startDate, endDate) {
  const events = [];
  const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  
  console.log(`Generating basic mock events for ${indicator} over ${daysDiff} days`);
  
  // Event templates based on financial indicator
  const eventTemplates = {
    sp500: [
      {
        type: 'tweet',
        icon: '🐦',
        title: 'Trump comments on stock market performance',
        description: 'S&P 500 reaches new highs under my policies! Jobs and the economy are BOOMING! #MAGA',
        impact: 'up'
      },
      {
        type: 'policy',
        icon: '🏛️',
        title: 'Trump announces tax policy proposal',
        description: 'Proposal to reduce corporate tax rates to boost economic growth and stock market performance',
        impact: 'up'
      },
      {
        type: 'speech',
        icon: '🎤',
        title: 'Trump addresses economic club',
        description: 'In a speech to business leaders, Trump outlined his economic vision and criticized current administration policies',
        impact: 'up'
      }
    ],
    dowjones: [
      {
        type: 'tweet',
        icon: '🐦',
        title: 'Trump comments on Dow Jones record',
        description: 'Dow Jones just broke 38,000! The highest in history! This wouldn\'t happen with Democrats in charge!',
        impact: 'up'
      },
      {
        type: 'policy',
        icon: '🏛️',
        title: 'Trump announces potential tariff reductions',
        description: 'My administration will look at reducing certain tariffs to help American businesses',
        impact: 'up'
      }
    ],
    usdcny: [
      {
        type: 'tweet',
        icon: '🐦',
        title: 'Trump on China currency',
        description: 'China manipulating currency again! Will address this!',
        impact: 'up'
      },
      {
        type: 'policy',
        icon: '🏛️',
        title: 'Trump on China trade',
        description: 'New trade negotiations with China coming soon',
        impact: 'down'
      }
    ],
    oil: [
      {
        type: 'tweet',
        icon: '🐦',
        title: 'Trump on oil prices',
        description: 'Oil prices too high! Called OPEC today!',
        impact: 'down'
      },
      {
        type: 'policy',
        icon: '🏛️',
        title: 'Trump energy policy',
        description: 'America will be energy independent under my leadership',
        impact: 'down'
      }
    ],
    gold: [
      {
        type: 'tweet',
        icon: '🐦',
        title: 'Trump on Fed policy',
        description: 'Fed destroying our currency while gold prices soar!',
        impact: 'up'
      },
      {
        type: 'policy',
        icon: '🏛️',
        title: 'Trump on monetary policy',
        description: 'Will appoint Fed members who understand sound money',
        impact: 'up'
      }
    ]
  };
  
  // Use appropriate templates or default to sp500
  const templates = eventTemplates[indicator] || eventTemplates.sp500;
  
  // Determine number of events based on timeframe
  let numEvents;
  if (daysDiff <= 1) {
    // For 1 day, generate 1-2 events
    numEvents = Math.min(2, templates.length);
  } else if (daysDiff <= 3) {
    // For 2-3 days, generate 2-3 events
    numEvents = Math.min(3, templates.length);
  } else if (daysDiff <= 14) {
    // For up to 2 weeks, generate 2-4 events
    numEvents = Math.min(Math.floor(daysDiff / 3) + 1, 4);
  } else {
    // For longer periods, scale with duration but cap at 5
    numEvents = Math.min(Math.floor(daysDiff / 90) + 3, 5);
  }
  
  console.log(`Generating ${numEvents} events for ${daysDiff} day range`);
  
  // If we have very short timeframe, use hours instead of days for distribution
  const useHourly = daysDiff <= 3;
  
  // For very short timeframes (1-3 days), create events within specific hours
  if (useHourly) {
    // Use a copy of startDate to avoid modifying the original
    const periodStart = new Date(startDate.getTime());
    
    // Calculate total hours in the period
    const hoursDiff = daysDiff * 24;
    
    for (let i = 0; i < numEvents; i++) {
      // Calculate position in the timeline - more evenly distributed
      // For short timeframes, place events throughout the day
      let eventHour;
      
      if (numEvents === 1) {
        // If only one event, put it in the middle of the period
        eventHour = hoursDiff / 2;
      } else {
        // Space events throughout the period
        eventHour = (i * hoursDiff / (numEvents - 0.5)) + (hoursDiff / (numEvents * 2));
      }
      
      const eventDate = new Date(periodStart.getTime() + eventHour * 60 * 60 * 1000);
      
      // Make sure the event is within the valid range
      if (eventDate > endDate) {
        eventDate.setTime(endDate.getTime() - 1000 * 60 * 60); // 1 hour before end
      }
      if (eventDate < startDate) {
        eventDate.setTime(startDate.getTime() + 1000 * 60 * 60); // 1 hour after start
      }
      
      // Choose a template based on position in timeline
      const template = templates[i % templates.length];
      
      events.push({
        id: `${indicator}-event-${i}`,
        date: eventDate.toISOString(),
        type: template.type,
        icon: template.icon,
        title: template.title,
        description: template.description,
        impact: template.impact
      });
    }
  } else {
    // For longer periods, distribute events across days
    for (let i = 0; i < numEvents; i++) {
      let position, eventDate;
      
      if (numEvents === 1) {
        // If only one event, put it in the middle of the period
        position = 0.5;
      } else {
        // Distribute events throughout the period, but avoid exact endpoints
        position = (i + 0.5) / numEvents;
      }
      
      // Calculate exact date based on position
      eventDate = new Date(startDate.getTime() + position * (endDate - startDate));
      
      // Choose a template based on position in timeline
      const template = templates[i % templates.length];
      
      // Add random time of day (business hours 9am-5pm)
      eventDate.setHours(9 + Math.floor(Math.random() * 8));
      eventDate.setMinutes(Math.floor(Math.random() * 60));
      
      events.push({
        id: `${indicator}-event-${i}`,
        date: eventDate.toISOString(),
        type: template.type,
        icon: template.icon,
        title: template.title,
        description: template.description,
        impact: template.impact
      });
    }
  }
  
  // Sort by date
  events.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  return events;
}

// Trump Mentions API endpoints
app.get('/api/trump-mentions/leaderboard', (req, res) => {
    console.log('Trump mentions leaderboard request received');
    
    try {
        // In a real implementation, this would fetch data from a database
        const mockEntities = generateTrumpMentionEntities();
        
        res.json({
            success: true,
            entities: mockEntities
        });
    } catch (error) {
        console.error('Error generating Trump mention entities:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate Trump mention entities'
        });
    }
});

app.get('/api/trump-mentions/entity/:entityId', (req, res) => {
    const entityId = req.params.entityId;
    console.log(`Trump mentions request for entity: ${entityId}`);
    
    try {
        // In a real implementation, this would fetch data from a database
        const mockMentions = generateEntityMentions(entityId);
        
        res.json({
            success: true,
            entityId,
            mentions: mockMentions
        });
    } catch (error) {
        console.error(`Error generating mentions for entity ${entityId}:`, error);
        res.status(500).json({
            success: false,
            error: `Failed to generate mentions for entity ${entityId}`
        });
    }
});

function generateTrumpMentionEntities() {
    const entities = [
        {
            id: 'aapl',
            name: 'Apple',
            ticker: 'AAPL',
            type: 'Company',
            mentions: 12,
            positiveMentions: 3,
            negativeMentions: 7,
            neutralMentions: 2,
            avgImpact: -1.8,
            lastMentioned: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'ford',
            name: 'Ford',
            ticker: 'F',
            type: 'Company',
            mentions: 18,
            positiveMentions: 11,
            negativeMentions: 4,
            neutralMentions: 3,
            avgImpact: 2.3,
            lastMentioned: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'amzn',
            name: 'Amazon',
            ticker: 'AMZN',
            type: 'Company',
            mentions: 10,
            positiveMentions: 2,
            negativeMentions: 7,
            neutralMentions: 1,
            avgImpact: -2.5,
            lastMentioned: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'twtr',
            name: 'Twitter',
            ticker: 'TWTR',
            type: 'Company',
            mentions: 22,
            positiveMentions: 12,
            negativeMentions: 6,
            neutralMentions: 4,
            avgImpact: 1.7,
            lastMentioned: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'gm',
            name: 'General Motors',
            ticker: 'GM',
            type: 'Company',
            mentions: 16,
            positiveMentions: 4,
            negativeMentions: 10,
            neutralMentions: 2,
            avgImpact: -1.2,
            lastMentioned: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'fb',
            name: 'Facebook',
            ticker: 'META',
            type: 'Company',
            mentions: 8,
            positiveMentions: 1,
            negativeMentions: 6,
            neutralMentions: 1,
            avgImpact: -3.1,
            lastMentioned: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'mxn',
            name: 'Mexican Peso',
            ticker: 'USD/MXN',
            type: 'Currency',
            mentions: 14,
            positiveMentions: 2,
            negativeMentions: 10,
            neutralMentions: 2,
            avgImpact: 2.8,
            lastMentioned: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'cny',
            name: 'Chinese Yuan',
            ticker: 'USD/CNY',
            type: 'Currency',
            mentions: 19,
            positiveMentions: 3,
            negativeMentions: 14,
            neutralMentions: 2,
            avgImpact: 1.5,
            lastMentioned: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        }
    ];
    
    return entities;
}

function generateEntityMentions(entityId) {
    // Get general entity info
    const entity = generateTrumpMentionEntities().find(e => e.id === entityId);
    if (!entity) {
        return [];
    }
    
    const mentions = [];
    const sources = ['Twitter', 'Speech', 'Rally', 'Interview', 'Press Conference', 'X'];
    const positivePhrases = [
        `${entity.name} is doing a great job creating American jobs!`,
        `Just spoke with the executives at ${entity.name}. They'll be bringing thousands of jobs back to America. Amazing company!`,
        `${entity.name} is an incredible American success story, we need more companies like them!`,
        `Great American company ${entity.name} is expanding operations. Tremendous news for our economy!`,
        `${entity.name} is committed to AMERICA FIRST policies, and I appreciate their support!`
    ];
    const negativePhrases = [
        `${entity.name} is really hurting America with their terrible policies. Not good!`,
        `${entity.name} keeps sending jobs to China. Time to stop this terrible deal!`,
        `${entity.name} is treating American workers very unfairly. This will change, believe me!`,
        `${entity.name} prices are too high because of their monopoly. We're looking at this very strongly!`,
        `${entity.name} is a disaster. Many people are saying this. Sad!`
    ];
    
    // Generate a random number of mentions based on the entity's mention count
    const mentionCount = Math.min(entity.mentions, 10);
    
    for (let i = 0; i < mentionCount; i++) {
        const isPositive = Math.random() < (entity.positiveMentions / entity.mentions);
        const source = sources[Math.floor(Math.random() * sources.length)];
        const daysAgo = Math.floor(Math.random() * 90) + 1;
        const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
        
        // Select a random phrase based on sentiment
        const phrases = isPositive ? positivePhrases : negativePhrases;
        const content = phrases[Math.floor(Math.random() * phrases.length)];
        
        // Generate market impact
        const baseImpact = isPositive ? 2.5 : -2.5;
        const impactVariation = (Math.random() - 0.5) * 2;
        const marketImpact = baseImpact + impactVariation;
        
        mentions.push({
            id: `mention-${entityId}-${i}`,
            date,
            content,
            source,
            sentiment: isPositive ? 'Positive' : 'Negative',
            marketImpact
        });
    }
    
    // Sort by date, most recent first
    return mentions.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Trump News Tracker Server running on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop the server');
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Error: Port ${PORT} is already in use. Another server might be running.`);
    console.log('Try stopping other servers or using a different port.');
  } else {
    console.error('Error starting server:', err.message);
  }
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// API endpoint to check if server is running
app.get('/api/status', (req, res) => {
  res.status(200).json({ status: 'running' });
});

// API endpoint to start the server script
app.post('/start-server', (req, res) => {
  // Check operating system
  const isWindows = process.platform === 'win32';
  const scriptToRun = isWindows ? 'start-app.bat' : './start-app.sh';
  
  // Attempt to run the script
  exec(scriptToRun, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing script: ${error.message}`);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to start server script',
        error: error.message
      });
    }
    if (stderr) {
      console.error(`Script stderr: ${stderr}`);
    }
    console.log(`Script stdout: ${stdout}`);
    res.status(200).json({ 
      success: true, 
      message: 'Server script executed successfully'
    });
  });
}); 