import { Hyperbrowser } from "@hyperbrowser/sdk";
import { config } from "dotenv";
import { NextResponse } from "next/server";
import type { Browser, Page } from "puppeteer-core";
import { connect } from "puppeteer-core";

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
}

export async function POST() {
  // Check if API key is available
  if (!process.env.HYPERBROWSER_API_KEY) {
    console.error("HYPERBROWSER_API_KEY is not set in environment variables");
    return NextResponse.json({
      success: false,
      message: "API key is not configured. Please set HYPERBROWSER_API_KEY in .env.local file.",
    } as ApiResponse);
  }

  const client = new Hyperbrowser({
    apiKey: process.env.HYPERBROWSER_API_KEY,
  });

  let result: ApiResponse = {
    success: false,
    message: "",
    debugInfo: {},
  };

  try {
    console.log("Creating Hyperbrowser session...");
    // Configure the session with debug options
    const session = await client.sessions.create({
      useStealth: true,
    });

    // Store session ID for debugging
    result.debugInfo!.sessionId = session.id;

    // Store the correct session URL for monitoring
    console.log("Session ID:", session.id);
    result.debugInfo!.sessionUrl = `https://app.hyperbrowser.ai/features/sessions/${session.id}`;
    console.log("View session at:", result.debugInfo!.sessionUrl);

    try {
      console.log("Connecting to browser...");
      const browser = await connect({
        browserWSEndpoint: session.wsEndpoint,
        defaultViewport: null,
      });

      const [page] = await browser.pages();

      // Execute the form filling script
      console.log("Starting form filling process...");
      const htmlContent = await fillForm(browser, page);

      // Store the HTML content in the result
      result.debugInfo!.htmlContent = htmlContent;

      result = {
        success: true,
        message: "Successfully filled out the GLG onboarding form",
        title: await page.title(),
        debugInfo: result.debugInfo,
      };
    } catch (error) {
      // Handle puppeteer-specific errors
      const err = error as Error;
      console.error(`Browser error: ${err.message}`);
      result = {
        success: false,
        message: `Browser error: ${err.message}`,
        debugInfo: result.debugInfo,
      };
    } finally {
      try {
        console.log("Stopping Hyperbrowser session...");
        await client.sessions.stop(session.id);

        // You can view the recording in the Hyperbrowser dashboard
        console.log("You can view the session details in the Hyperbrowser dashboard");
        console.log(`Session URL: ${result.debugInfo?.sessionUrl}`);
      } catch (stopError) {
        console.error("Error stopping session:", stopError);
      }
    }
  } catch (error) {
    // Handle session creation errors
    const err = error as Error;
    console.error(`Session creation error: ${err.message}`);
    result = { success: false, message: `Session error: ${err.message}` };
  }

  console.log("API response:", result);
  return NextResponse.json(result);
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
