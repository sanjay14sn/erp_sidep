export interface ProgramModule {
  id: number;
  title: string;
  duration: string;
  description: string;
}

const defaultModules: ProgramModule[] = [
  { id: 1, title: 'Program Orientation', duration: '2 hrs', description: 'Introduction to SIDEP, learning outcomes, and platform walkthrough.' },
  { id: 2, title: 'Core Concepts', duration: '8 hrs', description: 'Fundamental theory, terminology, and industry use cases.' },
  { id: 3, title: 'Hands-on Labs', duration: '12 hrs', description: 'Practical exercises with guided assignments and checkpoints.' },
  { id: 4, title: 'Project Workshop', duration: '10 hrs', description: 'Build a capstone mini-project applying program skills.' },
  { id: 5, title: 'Assessment & Review', duration: '4 hrs', description: 'Revision, mock evaluation, and mentor feedback session.' },
  { id: 6, title: 'Career Readiness', duration: '3 hrs', description: 'Resume tips, interview prep, and certification guidance.' },
];

const programModuleMap: Record<string, ProgramModule[]> = {
  'SAP Training': [
    { id: 1, title: 'SAP Overview & Navigation', duration: '3 hrs', description: 'SAP ecosystem, GUI, and organizational structure basics.' },
    { id: 2, title: 'FI / CO Fundamentals', duration: '10 hrs', description: 'Financial accounting and controlling core processes.' },
    { id: 3, title: 'MM & SD Essentials', duration: '10 hrs', description: 'Procurement, inventory, and sales distribution workflows.' },
    { id: 4, title: 'ABAP & Basis Introduction', duration: '8 hrs', description: 'Technical foundation, T-codes, and system administration overview.' },
    { id: 5, title: 'SAP S/4HANA & Fiori', duration: '6 hrs', description: 'Modern SAP UX, HANA database, and cloud deployment models.' },
    { id: 6, title: 'Implementation Project Lab', duration: '8 hrs', description: 'End-to-end SAP business scenario simulation.' },
  ],
  'Web Development': [
    { id: 1, title: 'HTML, CSS & Responsive UI', duration: '8 hrs', description: 'Semantic markup, layouts, flexbox, and mobile-first design.' },
    { id: 2, title: 'JavaScript Fundamentals', duration: '10 hrs', description: 'DOM, ES6+, async patterns, and browser APIs.' },
    { id: 3, title: 'React & Component Architecture', duration: '12 hrs', description: 'Hooks, routing, state management, and API integration.' },
    { id: 4, title: 'Backend & REST APIs', duration: '8 hrs', description: 'Node.js, Express, authentication, and database basics.' },
    { id: 5, title: 'Deployment & DevOps Basics', duration: '4 hrs', description: 'Hosting, environment setup, and production checklist.' },
    { id: 6, title: 'Full-Stack Capstone', duration: '10 hrs', description: 'Build and deploy a complete web application.' },
  ],
  'Data Analytics': [
    { id: 1, title: 'Data Foundations & SQL', duration: '8 hrs', description: 'Relational data, querying, joins, and aggregations.' },
    { id: 2, title: 'Python for Analytics', duration: '10 hrs', description: 'Pandas, NumPy, and data wrangling workflows.' },
    { id: 3, title: 'Visualization & Dashboards', duration: '8 hrs', description: 'Charts, KPIs, and storytelling with data.' },
    { id: 4, title: 'Statistics for Analysts', duration: '6 hrs', description: 'Descriptive stats, hypothesis testing, and correlation.' },
    { id: 5, title: 'BI Tools & Reporting', duration: '6 hrs', description: 'Business intelligence dashboards and stakeholder reports.' },
    { id: 6, title: 'Analytics Case Study', duration: '8 hrs', description: 'End-to-end analysis on a real-world dataset.' },
  ],
  Selenium: [
    { id: 1, title: 'Selenium Architecture & Setup', duration: '4 hrs', description: 'WebDriver, Grid, IDE overview and environment configuration.' },
    { id: 2, title: 'Locators & Element Interaction', duration: '8 hrs', description: 'XPath, CSS, ID, waits, and handling dynamic elements.' },
    { id: 3, title: 'Test Framework Fundamentals', duration: '8 hrs', description: 'JUnit/TestNG structure, assertions, and test organization.' },
    { id: 4, title: 'Page Object Model (POM)', duration: '6 hrs', description: 'Design patterns for maintainable automation frameworks.' },
    { id: 5, title: 'Data-Driven & Hybrid Frameworks', duration: '8 hrs', description: 'Excel/CSV data sources, parameterization, and reusable utilities.' },
    { id: 6, title: 'Automation Project Lab', duration: '10 hrs', description: 'End-to-end web application test suite with reporting.' },
  ],
};

export function getProgramModules(programName?: string | null): ProgramModule[] {
  if (!programName) return defaultModules;
  return programModuleMap[programName] || defaultModules.map((m) => ({
    ...m,
    title: `${programName}: ${m.title}`,
  }));
}

export const STANDARD_FEE = 10000;
export const SCHOLARSHIP_FEE = 1999;
export const SCHOLARSHIP_VALIDITY_MS = 72 * 60 * 60 * 1000;
