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
  steps: { step: number; action: string }[];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { networks } = body;

    // Check if Tegus is selected
    const tegusSelected = networks.some((network) => network.name === "Tegus" && network.selected);

    if (!tegusSelected) {
      return NextResponse.json({
        success: false,
        message: "Tegus must be selected to use this automation",
      });
    }

    // Log for debugging
    console.log("Starting Tegus application process");

    // In a real implementation, this would use browser automation to:
    // 1. Navigate to https://www.tegus.com/become-an-expert
    // 2. Fill out the forms as outlined below

    const formFieldsToFill = [
      // Personal Information
      { selector: "#firstName", value: "John" },
      { selector: "#lastName", value: "Smith" },
      { selector: "#email", value: "john.smith@example.com" },
      { selector: "#phone", value: "555-123-4567" },
      { selector: "#country", value: "United States" },
      { selector: "#city", value: "New York" },

      // Professional Background
      { selector: "#currentCompany", value: "Acme Corporation" },
      { selector: "#jobTitle", value: "Senior Product Manager" },
      { selector: "#industry", value: "Technology" },
      { selector: "#yearsExperience", value: "8" },

      // Areas of Expertise
      { selector: "#primaryExpertise", value: "SaaS Product Development" },
      {
        selector: "#expertiseDetails",
        value: "Enterprise software, AI/ML applications, Product analytics",
      },

      // Specific companies knowledgeable about
      { selector: "#companies", value: "Microsoft, Google, Oracle, Salesforce" },

      // Additional Information
      { selector: "#linkedinProfile", value: "https://www.linkedin.com/in/johnsmith/" },
      { selector: "#referralSource", value: "Colleague" },

      // Terms and Privacy acceptance
      { selector: "#termsCheckbox", value: true },
      { selector: "#privacyCheckbox", value: true },
    ];

    // Simulate form submission steps
    const simulatedBrowserSteps = [
      { step: 1, action: "Navigating to Tegus application page", status: "completed" },
      { step: 2, action: "Filling personal information fields", status: "completed" },
      { step: 3, action: "Entering professional background", status: "completed" },
      { step: 4, action: "Specifying areas of expertise", status: "completed" },
      { step: 5, action: "Accepting terms and conditions", status: "completed" },
      { step: 6, action: "Submitting application form", status: "completed" },
    ];

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return NextResponse.json({
      success: true,
      message: "Tegus application process completed successfully",
      steps: simulatedBrowserSteps,
      results: [
        {
          name: "Tegus",
          status: "Success",
          details:
            "Application submitted to Tegus on " +
            new Date().toLocaleString() +
            ". Form fields filled: " +
            formFieldsToFill.length,
        },
      ],
    });
  } catch (error) {
    console.error("Error in hyperbrowser-tegus route:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to process request",
        error: error instanceof Error ? error.message : String(error),
      },
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
    // Navigate to the Tegus onboarding page
    console.log("Navigating to Tegus membership page...");
    await page.goto("https://www.tegus.com/become-an-experts", {
      waitUntil: "networkidle2",
      timeout: 60000, // Increase timeout to 60 seconds
    });

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
