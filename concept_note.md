# Project Concept Note: Kairós

## 1. Project Information
- **Application Name:** Kairós (The Opportune Interview Simulator)
- **Deployment URL (AWS):** `[INSERT_AWS_URL_HERE]`

---

## 2. Problem Statement & Objective
Job seekers frequently fail interviews not because they lack technical expertise or relevant skills, but because they struggle to articulate their experience under live, high-pressure conditions. Standard mock interview prep tools are static, repetitive, and fail to simulate the natural, unpredictable flow of a real interview. 

**Objective:**  
To build an interactive, AI-powered mock interview simulator that acts as a real-time hiring manager. Kairós analyzes a candidate's resume, predicts technical and behavioral questions tailored to their profile, conducts a structured live mock interview, and provides instant constructive feedback.

---

## 3. Target User & Use Case
- **Target Audience:** Job seekers, university graduates, career switchers, and professionals preparing for technical or behavioral interviews.
- **Primary Use Case:** A software engineer preparing for a job interview can paste their resume and the target job description. The app extracts their skillset, creates a customized list of predicted questions, and launches a real-time conversational interface where they practice answers and get evaluated on the spot.

---

## 4. LLM Model & API Used
- **Primary LLM Model:** Google Gemini 2.5 Flash
- **API Provider:** Google AI Studio (client-side direct API integration)
- **Backup LLM Model:** OpenAI GPT-4o-mini (client-side API fallback)
- **Database / BaaS:** Supabase (for session persistence, metadata storage, and candidate authentication tokens)

---

## 5. Key Features
- **Résumé Parsing & Profile Extraction:** Leverages Gemini to parse raw resume text and extract years of experience, hard skills, soft skills, and a summary.
- **Custom Question Generation:** Predicts 5 behavioral questions (structured around the STAR methodology: Situation, Task, Action, Result) and 5 technical questions based on the candidate's experience and the target job description.
- **Live Conversational Simulation:** Conducts a multi-turn, interactive mock interview using streaming technology for instant conversational response.
- **Actionable Real-Time Feedback:** Evaluates the candidate's answers on the fly, offering tips for improvement, flagging missing keywords, and highlighting strengths.
- **Secure Persistence:** Automatically syncs interview briefs and status to Supabase so candidates can review past mock interviews.

---

## 6. Expected User Experience & Outcomes
- **Sleek Premium Design:** A clean, responsive dark-themed interface built using Tailwind CSS, featuring subtle animations, loading states, and custom status indicators.
- **Realistic Practice:** A conversational agent that doesn't just read questions but reacts dynamic-by-turn to candidate answers.
- **Boosted Confidence & Performance:** By getting evaluated in a safe, constructive mock environment, candidates learn to structure their thoughts effectively, identify gaps in their experience, and enter their real interviews prepared to succeed.
