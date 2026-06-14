const resumeInput = document.querySelector("#resumeInput");
const chooseFileButton = document.querySelector("#chooseFileButton");
const dropzone = document.querySelector("#dropzone");
const fileStatus = document.querySelector("#fileStatus");
const jobDescription = document.querySelector("#jobDescription");
const sampleJobButton = document.querySelector("#sampleJobButton");
const resetButton = document.querySelector("#resetButton");
const resumeDraft = document.querySelector("#resumeDraft");
const downloadButton = document.querySelector("#downloadButton");
const copyButton = document.querySelector("#copyButton");

const scoreRing = document.querySelector("#scoreRing");
const scoreValue = document.querySelector("#scoreValue");
const scoreLabel = document.querySelector("#scoreLabel");
const parseMetric = document.querySelector("#parseMetric");
const keywordMetric = document.querySelector("#keywordMetric");
const impactMetric = document.querySelector("#impactMetric");
const missingMetric = document.querySelector("#missingMetric");
const issueCount = document.querySelector("#issueCount");
const recommendationList = document.querySelector("#recommendationList");
const signalList = document.querySelector("#signalList");

const sectionAliases = {
  summary: ["summary", "profile", "professional summary", "career summary", "objective"],
  skills: ["skills", "technical skills", "core competencies", "technologies"],
  experience: ["experience", "work experience", "professional experience", "employment"],
  education: ["education", "academic background"],
  projects: ["projects", "selected projects", "portfolio"],
  certifications: ["certifications", "licenses", "credentials"],
};

const actionVerbs = [
  "built",
  "created",
  "developed",
  "improved",
  "reduced",
  "increased",
  "automated",
  "launched",
  "led",
  "owned",
  "designed",
  "implemented",
  "analyzed",
  "optimized",
  "delivered",
  "managed",
  "migrated",
  "streamlined",
  "generated",
];

const stopWords = new Set(
  "a about above after again against all am an and any are as at be because been before being below between both but by can did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just me more most my myself no nor not of off on once only or other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why will with you your yours yourself yourselves".split(
    " ",
  ),
);

const sampleJob = `Data Analyst

Responsibilities:
- Build SQL dashboards and recurring business reports.
- Analyze customer, revenue, and operations data to identify trends.
- Partner with stakeholders to define KPIs and improve data quality.
- Use Power BI, Tableau, Excel, Python, and Snowflake to deliver insights.

Requirements:
- 2+ years of analytics experience.
- Strong SQL, dashboarding, stakeholder communication, and data storytelling.
- Experience with ETL, data modeling, and metric definitions.`;

let currentResumeText = "";
let currentFileName = "resume";
let currentFileExtension = "txt";

window.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }
  renderSignals(null);
});

chooseFileButton.addEventListener("click", () => resumeInput.click());
resumeInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) analyzeFile(file);
});

["dragenter", "dragover"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove("dragging");
  });
});

dropzone.addEventListener("drop", (event) => {
  const [file] = event.dataTransfer.files;
  if (file) analyzeFile(file);
});

jobDescription.addEventListener("input", () => {
  if (currentResumeText) analyzeText(currentResumeText);
});

sampleJobButton.addEventListener("click", () => {
  jobDescription.value = sampleJob;
  if (currentResumeText) analyzeText(currentResumeText);
});

resetButton.addEventListener("click", () => {
  currentResumeText = "";
  currentFileName = "resume";
  currentFileExtension = "txt";
  resumeInput.value = "";
  jobDescription.value = "";
  resumeDraft.value = "";
  fileStatus.textContent = "No file selected";
  updateScore(null);
  renderRecommendations([]);
  renderSignals(null);
  parseMetric.textContent = "--";
  keywordMetric.textContent = "--";
  impactMetric.textContent = "--";
  missingMetric.textContent = "--";
});

downloadButton.addEventListener("click", async () => {
  const content = resumeDraft.value.trim();
  if (!content) return;
  downloadButton.disabled = true;
  const originalLabel = downloadButton.innerHTML;
  downloadButton.innerHTML = '<i data-lucide="loader"></i>Preparing';
  if (window.lucide) window.lucide.createIcons();

  try {
    const output = currentFileExtension === "pdf" ? await buildPdfBlob(content) : buildTextBlob(content);
    const { blob, extension } = output;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(currentFileName)}-ats-friendly.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } finally {
    downloadButton.disabled = false;
    downloadButton.innerHTML = originalLabel;
    if (window.lucide) window.lucide.createIcons();
  }
});

copyButton.addEventListener("click", async () => {
  if (!resumeDraft.value.trim()) return;
  await navigator.clipboard.writeText(resumeDraft.value);
  copyButton.innerHTML = '<i data-lucide="check"></i>Copied';
  if (window.lucide) window.lucide.createIcons();
  window.setTimeout(() => {
    copyButton.innerHTML = '<i data-lucide="copy"></i>Copy';
    if (window.lucide) window.lucide.createIcons();
  }, 1400);
});

async function analyzeFile(file) {
  currentFileName = file.name.replace(/\.[^.]+$/, "");
  currentFileExtension = file.name.split(".").pop().toLowerCase();
  fileStatus.textContent = `Reading ${file.name}...`;

  try {
    const text = await extractText(file);
    currentResumeText = text;
    fileStatus.textContent = `${file.name} parsed (${text.split(/\s+/).filter(Boolean).length} words). Download: ${currentFileExtension.toUpperCase()}`;
    analyzeText(text);
  } catch (error) {
    fileStatus.textContent = "Could not parse this file. Try exporting as PDF or .txt.";
    renderRecommendations([
      {
        severity: "high",
        title: "Resume text could not be extracted",
        detail:
          "Use a text-based PDF or paste/export the resume as a .txt file. Scanned image PDFs need OCR before ATS systems can read them reliably.",
      },
    ]);
    console.error(error);
  }
}

async function extractText(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  if (extension === "txt" || extension === "text") {
    return file.text();
  }
  if (extension === "pdf") {
    return extractPdfText(file);
  }
  throw new Error("Unsupported file type");
}

function buildTextBlob(content) {
  return {
    blob: new Blob([content], { type: "text/plain;charset=utf-8" }),
    extension: "txt",
  };
}

async function buildPdfBlob(content) {
  const { PDFDocument, StandardFonts, rgb } = await import("https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm");
  const pdfDoc = await PDFDocument.create();
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pageSize = { width: 612, height: 792 };
  const margin = 54;
  const fontSize = 10.5;
  const headingSize = 12;
  const lineHeight = 15;
  let page = pdfDoc.addPage([pageSize.width, pageSize.height]);
  let y = pageSize.height - margin;

  const drawLine = (line, options = {}) => {
    if (y < margin) {
      page = pdfDoc.addPage([pageSize.width, pageSize.height]);
      y = pageSize.height - margin;
    }
    const isHeading = /^[A-Z][A-Z\s]+$/.test(line) && line.length < 42;
    page.drawText(line, {
      x: margin,
      y,
      size: isHeading ? headingSize : fontSize,
      font: isHeading || options.bold ? boldFont : regularFont,
      color: rgb(0.08, 0.1, 0.08),
    });
    y -= isHeading ? lineHeight + 3 : lineHeight;
  };

  content.split("\n").forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      y -= lineHeight * 0.55;
      return;
    }
    wrapText(line, regularFont, fontSize, pageSize.width - margin * 2).forEach((wrappedLine, index) => {
      drawLine(index === 0 ? wrappedLine : `  ${wrappedLine}`);
    });
  });

  const pdfBytes = await pdfDoc.save();
  return {
    blob: new Blob([pdfBytes], { type: "application/pdf" }),
    extension: "pdf",
  };
}

function wrapText(text, font, size, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(testLine, size) <= maxWidth) {
      currentLine = testLine;
      return;
    }
    if (currentLine) lines.push(currentLine);
    currentLine = word;
  });

  if (currentLine) lines.push(currentLine);
  return lines;
}

async function extractPdfText(file) {
  const pdfjsLib = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    pages.push(pageText);
  }
  return pages.join("\n\n");
}

function analyzeText(text) {
  const cleanText = normalizeText(text);
  const lower = cleanText.toLowerCase();
  const words = tokenize(cleanText);
  const sections = detectSections(lower);
  const contacts = {
    email: /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(cleanText),
    phone: /(\+?\d[\d\s().-]{7,}\d)/.test(cleanText),
    linkedin: /linkedin\.com\/in\//i.test(cleanText),
    github: /github\.com\//i.test(cleanText),
    portfolio: /(https?:\/\/|www\.)/i.test(cleanText),
  };
  const bullets = cleanText.split("\n").filter((line) => /^\s*[-*•]/.test(line)).length;
  const numbers = (cleanText.match(/\b\d+[%+$kKmM]?\b/g) || []).length;
  const verbsFound = actionVerbs.filter((verb) => new RegExp(`\\b${verb}\\b`, "i").test(cleanText));
  const jobTokens = importantTerms(jobDescription.value);
  const resumeTerms = new Set(importantTerms(cleanText));
  const matchedKeywords = jobTokens.filter((term) => resumeTerms.has(term));
  const missingKeywords = jobTokens.filter((term) => !resumeTerms.has(term)).slice(0, 16);

  const parseScore = scoreParseability(cleanText, sections, contacts);
  const keywordScore = jobTokens.length ? Math.round((matchedKeywords.length / jobTokens.length) * 100) : 72;
  const impactScore = scoreImpact(words.length, bullets, numbers, verbsFound.length);
  const basics = requiredBasics(sections, contacts, words.length);
  const missingBasics = basics.filter((item) => !item.ok);
  const finalScore = Math.round(parseScore * 0.4 + keywordScore * 0.25 + impactScore * 0.25 + (100 - missingBasics.length * 12) * 0.1);

  const analysis = {
    cleanText,
    words,
    sections,
    contacts,
    bullets,
    numbers,
    verbsFound,
    jobTokens,
    matchedKeywords,
    missingKeywords,
    parseScore,
    keywordScore,
    impactScore,
    missingBasics,
    finalScore: clamp(finalScore, 0, 100),
  };

  updateScore(analysis);
  renderRecommendations(buildRecommendations(analysis));
  renderSignals(analysis);
  resumeDraft.value = buildResumeDraft(analysis);
}

function normalizeText(text) {
  return text
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function tokenize(text) {
  return text.toLowerCase().match(/[a-z][a-z+#.-]{1,}/g) || [];
}

function importantTerms(text) {
  const counts = new Map();
  tokenize(text).forEach((word) => {
    const normalized = word.replace(/[.,]/g, "");
    if (normalized.length < 3 || stopWords.has(normalized)) return;
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  });
  return [...counts.entries()]
    .filter(([, count]) => count >= 1)
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, 40)
    .map(([word]) => word);
}

function detectSections(lower) {
  return Object.fromEntries(
    Object.entries(sectionAliases).map(([section, aliases]) => [
      section,
      aliases.some((alias) => {
        const headingPattern = new RegExp(`(^|\\n)\\s*${escapeRegExp(alias)}\\s*:?\\s*(\\n|$)`, "i");
        const inlinePattern = new RegExp(`\\b${escapeRegExp(alias)}\\b`, "i");
        return headingPattern.test(lower) || inlinePattern.test(lower);
      }),
    ]),
  );
}

function scoreParseability(text, sections, contacts) {
  let score = 35;
  score += contacts.email ? 10 : 0;
  score += contacts.phone ? 10 : 0;
  score += sections.skills ? 10 : 0;
  score += sections.experience ? 15 : 0;
  score += sections.education ? 8 : 0;
  score += sections.summary ? 5 : 0;
  score += text.length > 1200 ? 7 : 0;
  if (/\|{2,}/.test(text)) score -= 8;
  if (/(text box|table of contents)/i.test(text)) score -= 8;
  return clamp(score, 0, 100);
}

function scoreImpact(wordCount, bulletCount, numberCount, verbCount) {
  let score = 30;
  score += Math.min(25, bulletCount * 3);
  score += Math.min(25, numberCount * 3);
  score += Math.min(15, verbCount * 3);
  score += wordCount >= 350 && wordCount <= 900 ? 5 : 0;
  return clamp(score, 0, 100);
}

function requiredBasics(sections, contacts, wordCount) {
  return [
    { label: "Email", ok: contacts.email },
    { label: "Phone", ok: contacts.phone },
    { label: "Skills section", ok: sections.skills },
    { label: "Experience section", ok: sections.experience },
    { label: "Education section", ok: sections.education },
    { label: "Enough resume content", ok: wordCount >= 300 },
  ];
}

function buildRecommendations(analysis) {
  const recommendations = [];

  analysis.missingBasics.forEach((item) => {
    recommendations.push({
      severity: "high",
      title: `Add ${item.label.toLowerCase()}`,
      detail: `${item.label} is a common ATS and recruiter screening field. Add it using a simple text heading or contact line.`,
    });
  });

  if (analysis.keywordScore < 65 && analysis.jobTokens.length) {
    recommendations.push({
      severity: "high",
      title: "Improve keyword alignment",
      detail: `Add relevant missing terms where truthful: ${analysis.missingKeywords.slice(0, 8).join(", ")}.`,
    });
  }

  if (analysis.numbers < 6) {
    recommendations.push({
      severity: "medium",
      title: "Add measurable outcomes",
      detail: "Strengthen bullets with scale, frequency, revenue, time saved, accuracy, users, rows, dashboards, or percent improvement.",
    });
  }

  if (analysis.verbsFound.length < 6) {
    recommendations.push({
      severity: "medium",
      title: "Start bullets with stronger action verbs",
      detail: "Use verbs such as built, automated, analyzed, optimized, delivered, reduced, increased, and implemented.",
    });
  }

  if (analysis.bullets < 8) {
    recommendations.push({
      severity: "medium",
      title: "Use concise bullet points",
      detail: "ATS systems can parse paragraphs, but recruiters scan bullets faster. Aim for 3-5 bullets under each recent role.",
    });
  }

  if (!analysis.contacts.linkedin && !analysis.contacts.portfolio) {
    recommendations.push({
      severity: "low",
      title: "Add a professional profile link",
      detail: "A LinkedIn, GitHub, or portfolio URL gives recruiters a second proof point and helps identity matching.",
    });
  }

  if (analysis.words.length > 1000) {
    recommendations.push({
      severity: "low",
      title: "Shorten the resume",
      detail: "The extracted resume is long. Trim older roles and repeat bullets so the strongest keywords and outcomes stay visible.",
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      severity: "low",
      title: "Resume is in solid ATS shape",
      detail: "Use the draft below to keep formatting simple, then tailor the top skills and bullets for each target job.",
    });
  }

  return recommendations;
}

function buildResumeDraft(analysis) {
  const lines = analysis.cleanText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const name = lines.find((line) => /^[A-Z][a-z]+ [A-Z][a-z]+/.test(line)) || currentFileName.replace(/[-_]/g, " ");
  const contactLines = lines.filter((line) => /@|linkedin\.com|github\.com|\+?\d[\d\s().-]{7,}\d/i.test(line)).slice(0, 3);
  const extractedBullets = lines
    .filter((line) => /^\s*[-*•]/.test(line) || actionVerbs.some((verb) => line.toLowerCase().startsWith(`${verb} `)))
    .map((line) => line.replace(/^\s*[-*•]\s*/, "- "))
    .slice(0, 18);
  const skills = [...new Set([...analysis.matchedKeywords, ...importantTerms(analysis.cleanText).slice(0, 20)])].slice(0, 24);

  return [
    titleCase(name),
    contactLines.length ? contactLines.join(" | ") : "Email | Phone | LinkedIn | Location",
    "",
    "SUMMARY",
    "Results-driven professional with experience translating business needs into measurable outcomes. Skilled at communicating insights, improving workflows, and delivering reliable work in fast-moving environments.",
    "",
    "CORE SKILLS",
    skills.length ? skills.join(" | ") : "Add role-specific skills from the target job description",
    "",
    "PROFESSIONAL EXPERIENCE",
    ...(extractedBullets.length
      ? extractedBullets
      : [
          "- Built and improved workflows that supported measurable team outcomes.",
          "- Analyzed data, requirements, and stakeholder feedback to identify practical improvements.",
          "- Delivered clear documentation and recurring updates for cross-functional partners.",
        ]),
    "",
    "EDUCATION",
    findEducationLine(lines) || "Degree, University, Graduation Year",
    "",
    "ATS FORMAT NOTES",
    "- Keep this version in a single-column layout.",
    "- Use standard headings: Summary, Skills, Professional Experience, Education, Projects, Certifications.",
    "- Avoid tables, text boxes, icons used as text, headers/footers for critical contact details, and image-only PDFs.",
  ].join("\n");
}

function updateScore(analysis) {
  if (!analysis) {
    scoreRing.style.setProperty("--score", 0);
    scoreValue.textContent = "--";
    scoreLabel.textContent = "Upload a resume";
    return;
  }
  scoreRing.style.setProperty("--score", analysis.finalScore);
  scoreValue.textContent = analysis.finalScore;
  scoreLabel.textContent = scoreText(analysis.finalScore);
  parseMetric.textContent = analysis.parseScore;
  keywordMetric.textContent = analysis.jobTokens.length ? analysis.keywordScore : "Add JD";
  impactMetric.textContent = analysis.impactScore;
  missingMetric.textContent = analysis.missingBasics.length;
}

function renderRecommendations(recommendations) {
  issueCount.textContent = `${recommendations.length} ${recommendations.length === 1 ? "issue" : "issues"}`;
  recommendationList.innerHTML = recommendations
    .map(
      (item) => `
        <article class="recommendation ${item.severity}">
          <i data-lucide="${item.severity === "high" ? "alert-triangle" : item.severity === "medium" ? "circle-dot" : "info"}"></i>
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.detail)}</p>
          </div>
        </article>
      `,
    )
    .join("");
  if (window.lucide) window.lucide.createIcons();
}

function renderSignals(analysis) {
  const signals = analysis
    ? [
        ["Contact", `${Object.values(analysis.contacts).filter(Boolean).length}/5 signals found`, "badge-check"],
        ["Sections", `${Object.values(analysis.sections).filter(Boolean).length}/6 standard sections`, "layout-list"],
        ["Keywords", analysis.jobTokens.length ? `${analysis.matchedKeywords.length}/${analysis.jobTokens.length} matched` : "Paste a job description", "target"],
        ["Metrics", `${analysis.numbers} quantified details`, "percent"],
        ["Action verbs", `${analysis.verbsFound.length} strong verbs found`, "zap"],
      ]
    : [
        ["Contact", "Waiting for resume", "badge-check"],
        ["Sections", "Waiting for resume", "layout-list"],
        ["Keywords", "Paste a job description", "target"],
        ["Metrics", "Waiting for resume", "percent"],
        ["Action verbs", "Waiting for resume", "zap"],
      ];

  signalList.innerHTML = signals
    .map(
      ([title, detail, icon]) => `
        <article class="signal">
          <i data-lucide="${icon}"></i>
          <div>
            <strong>${title}</strong>
            <span>${detail}</span>
          </div>
        </article>
      `,
    )
    .join("");
  if (window.lucide) window.lucide.createIcons();
}

function findEducationLine(lines) {
  return lines.find((line) => /(university|college|bachelor|master|phd|degree|gpa)/i.test(line));
}

function scoreText(score) {
  if (score >= 85) return "Excellent";
  if (score >= 72) return "Strong";
  if (score >= 58) return "Needs tailoring";
  return "High risk";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return entities[character];
  });
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "resume";
}

function titleCase(value) {
  return value
    .replace(/[-_]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
