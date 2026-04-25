import { rewriteReviewToMoroccanDarija } from './src/app/api/rpc/route.ts';

async function testRewrite() {
  try {
    console.log("Testing rewrite function directly...");
    const originalText = "This place is great, the food was amazing and the service was excellent.";
    const restaurantName = "Test Restaurant";
    
    // Manually set the environment variables needed
    process.env.OPENAI_API_KEY = ""; // Ensure it tries Gemini
    process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAR7WMVNfoUQl7_QPPAHmPEv0cTpMuDWPk';

    const rewritten = await rewriteReviewToMoroccanDarija(originalText, restaurantName);

    console.log("Original:", originalText);
    console.log("Rewritten:", rewritten);

    if (!rewritten || rewritten === originalText) {
      throw new Error("Rewrite failed or returned original text.");
    }

    console.log("\nTest PASSED.");
  } catch (error) {
    console.error("\nTest FAILED:", error);
    process.exit(1);
  }
}

testRewrite().then(() => process.exit(0));
