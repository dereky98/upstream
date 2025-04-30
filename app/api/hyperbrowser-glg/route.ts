import { config } from "dotenv";
import { NextResponse } from "next/server";
import type { Browser, Page } from "puppeteer-core";

// Load environment variables
config();

interface ApiResponse {
  success: boolean;
  message: string;
  title?: string;
  debugInfo?: {
    sessionId?: string;
    sessionUrl?: string;
    htmlContent?: string;
  };
  latestLog: string;
  results: { name: string; status: string; details: string }[];
}

// Global variable to store logs (could be replaced with Redis in production)
let currentLogs = [];
let currentNetwork = "";

// Endpoint to get current logs
export async function GET(request: Request) {
  return NextResponse.json({
    logs: currentLogs,
    currentNetwork,
  });
}

export async function POST(request: Request) {
  try {
    // Clear previous logs
    currentLogs = [];

    const body = await request.json();
    const { networks } = body;

    // Get GLG network from selection
    const glgNetwork = networks.find((n) => n.name === "GLG");

    if (!glgNetwork) {
      return NextResponse.json({
        success: false,
        message: "GLG must be selected",
      });
    }

    currentNetwork = "GLG";

    // Add logs that will be retrievable via GET endpoint
    const addLog = (message) => {
      console.log(message); // Terminal log
      currentLogs.push(message); // Store for client retrieval
    };

    addLog("Starting GLG application process");
    addLog("Navigating to GLG website");

    // Simulate browser automation with logs
    addLog("Opening GLG application form..");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    addLog("Filling personal information..");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    addLog("Entering professional experience..");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    addLog("Submitting application..");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    addLog("Application submitted successfully..");

    return NextResponse.json({
      success: true,
      message: "GLG application complete",
      logs: currentLogs,
    });
  } catch (error) {
    console.error("Error in GLG application:", error);
    currentLogs.push(`Error: ${error.message}`);
    return NextResponse.json(
      { success: false, message: "Failed to process request", logs: currentLogs },
      { status: 500 }
    );
  }
}

// Form filling function
async function fillForm(browser: Browser, page: Page): Promise<string> {
  // Helper function for waiting
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  let htmlContent = "";

  try {
    // Navigate to the GLG onboarding page
    console.log("Navigating to GLG membership page...");
    await page.goto(
      "https://membership.glgresearch.com/onboarding/?campaign=glgit-src-council-members",
      {
        waitUntil: "networkidle2",
        timeout: 60000, // Increase timeout to 60 seconds
      }
    );

    // Wait for form to load fully and be visible
    console.log("Waiting for form to load...");
    await page.waitForSelector(".ui.form", { visible: true, timeout: 30000 });

    // Get the HTML content for debugging before filling
    htmlContent = await page.content();
    console.log("Captured initial HTML content of the form");

    // Add a pause to ensure the form is fully interactive
    await wait(2000);

    // Fill out the form using more precise selectors and with waits between operations
    console.log("Filling out form fields...");

    // Prefix dropdown (optional)
    try {
      console.log("Selecting prefix...");
      await page.click('div[name="prefixCode"]');
      await wait(1000);
      await page.click(".visible .item:first-child"); // Select the first option (Mr.)
      await wait(500);
    } catch (prefixError: unknown) {
      if (prefixError instanceof Error) {
        console.log("Skipping prefix selection - not required:", prefixError.message);
      } else {
        console.log("Skipping prefix selection - not required");
      }
    }

    // First name
    console.log("Filling first name...");
    await page.type('input[name="firstname"]', "John", { delay: 100 });
    await wait(500);

    // Last name
    console.log("Filling last name...");
    await page.type('input[name="lastname"]', "Doe", { delay: 100 });
    await wait(500);

    // Email
    console.log("Filling email...");
    await page.type('input[name="email"]', "john.doe@example.com", { delay: 100 });
    await wait(500);

    // Phone number - using the react-tel-input component
    console.log("Filling phone number...");
    await page.type(".react-tel-input input", "1234567890", { delay: 100 });
    await wait(500);

    // Country - using the Semantic UI dropdown
    console.log("Selecting country...");
    await page.click('div[name="country"]');
    await wait(1000);

    // Get HTML content with country dropdown open
    const countryDropdownHtml = await page.content();
    console.log("Captured HTML content with country dropdown open");

    // Select United States
    await page.click('.visible .item[role="option"] .us.flag');
    await wait(1000);

    // Timezone - using the Semantic UI dropdown
    console.log("Selecting timezone...");
    const timezoneSelector = 'div[role="combobox"][aria-expanded="false"]';

    await page.click(timezoneSelector);
    await wait(1000);

    // Get HTML content with timezone dropdown open
    const timezoneDropdownHtml = await page.content();
    console.log("Captured HTML content with timezone dropdown open");

    // Select America/New York timezone
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll(".visible .item"));
      const newYorkItem = items.find((item) => item.textContent?.includes("America/New York"));
      if (newYorkItem) {
        (newYorkItem as HTMLElement).click();
      }
    });
    await wait(1000);

    // Password fields
    console.log("Setting password...");
    await page.type('input[name="password"]', "TestPass123!", { delay: 100 });
    await wait(500);
    await page.type('input[name="password2"]', "TestPass123!", { delay: 100 });
    await wait(500);

    // Agree to confidentiality agreement - using a more specific selector for the checkbox
    console.log("Checking agreement checkbox...");
    await page.click(".ui.fitted.checkbox");
    await wait(1000);

    // Wait for "Next" button and check if it becomes enabled
    console.log("Checking for Next button...");
    // First, check if the button exists at all regardless of enabled state
    const nextButtonSelector = "button.ui.primary.right.floated.button";
    await page.waitForSelector(nextButtonSelector, { timeout: 10000 });

    // Wait a bit to see if it becomes enabled
    await wait(3000);

    // Check button state
    const isButtonDisabled = await page.evaluate(() => {
      const button = document.querySelector("button.ui.primary.right.floated.button");
      return button ? button.hasAttribute("disabled") : true;
    });

    if (isButtonDisabled) {
      console.log("Next button exists but remains disabled - form may have validation issues");
    } else {
      console.log("Next button is enabled and ready for submission");
    }

    // NOTE: We're not actually clicking the submit button here to avoid actual submission
    console.log("Form ready for submission (not submitting in this demo)");

    // Get the final HTML content
    const finalHtml = await page.content();
    console.log("Captured final HTML content after form completion");

    // Return the HTML content with the most detail (the one with dropdowns open)
    return timezoneDropdownHtml || countryDropdownHtml || finalHtml || htmlContent;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error during form filling:", error.message);
    } else {
      console.error("Unknown error during form filling");
    }

    // Try to get the HTML content even on error
    try {
      htmlContent = await page.content();
      console.log("Captured HTML content on error");
    } catch (contentError: unknown) {
      if (contentError instanceof Error) {
        console.error("Could not get HTML content:", contentError.message);
      } else {
        console.error("Unknown error getting HTML content");
      }
    }

    throw error;
  }
}
