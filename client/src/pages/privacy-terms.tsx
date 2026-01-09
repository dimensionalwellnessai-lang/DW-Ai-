import { PageHeader } from "@/components/page-header";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function PrivacyTermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Privacy & Terms" backPath="/settings" />

      <main className="p-4 max-w-2xl mx-auto">
        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
            <section>
              <h1 className="text-2xl font-display font-semibold mb-2">Dimensional Wellness (DW)</h1>
              <h2 className="text-lg text-muted-foreground">Privacy Policy & Terms of Use</h2>
              <p className="text-sm text-muted-foreground">Last updated: January 2026</p>
            </section>

            <hr className="my-6" />

            <section>
              <h3 className="text-lg font-semibold mb-3">1. What Dimensional Wellness Is (and Is Not)</h3>
              <p className="text-muted-foreground mb-3">
                Dimensional Wellness ("DW") is a personal life organization and wellness support tool.
              </p>
              <p className="text-muted-foreground mb-2">DW helps users:</p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>Reflect on their life systems</li>
                <li>Organize routines, plans, and schedules</li>
                <li>Explore wellness tools like movement, nutrition, recovery, and journaling</li>
                <li>Receive AI-generated guidance and suggestions</li>
              </ul>
              <p className="text-muted-foreground mt-3 mb-2">DW is not:</p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>Medical advice</li>
                <li>Mental health treatment</li>
                <li>Therapy or coaching</li>
                <li>A replacement for professional care</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                Always use DW in a way that feels safe and appropriate for you.
              </p>
            </section>

            <hr className="my-6" />

            <section>
              <h3 className="text-lg font-semibold mb-3">2. Your Safety Comes First</h3>
              <p className="text-muted-foreground">
                DW does not diagnose, treat, or promise outcomes related to physical or mental health.
              </p>
              <p className="text-muted-foreground mt-2">
                If you are experiencing distress, crisis, or medical concerns, please seek help from a qualified professional or local support resources.
              </p>
            </section>

            <hr className="my-6" />

            <section>
              <h3 className="text-lg font-semibold mb-3">3. Information We Collect</h3>
              
              <h4 className="font-medium mt-4 mb-2">A. Information You Provide</h4>
              <p className="text-muted-foreground mb-2">You may choose to provide:</p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>Messages you type into the app</li>
                <li>Preferences, goals, and planning inputs</li>
                <li>Uploaded documents (PDFs, text files, etc.)</li>
                <li>Optional feedback or check-ins</li>
              </ul>
              <p className="text-muted-foreground mt-2">You are always in control of what you share.</p>

              <h4 className="font-medium mt-4 mb-2">B. Automatically Collected Information</h4>
              <p className="text-muted-foreground mb-2">We may collect limited technical information such as:</p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>Device type</li>
                <li>Browser type</li>
                <li>App usage events (for stability and improvement)</li>
              </ul>
              <p className="text-muted-foreground mt-2">This data is used only to improve performance and reliability.</p>
            </section>

            <hr className="my-6" />

            <section>
              <h3 className="text-lg font-semibold mb-3">4. How Your Data Is Used</h3>
              <p className="text-muted-foreground mb-2">Your data is used to:</p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>Provide app functionality</li>
                <li>Generate AI responses</li>
                <li>Organize plans, schedules, and life systems</li>
                <li>Improve app quality and reliability</li>
              </ul>
              <p className="text-muted-foreground mt-3 mb-2">We do not:</p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>Sell your personal data</li>
                <li>Use your data for advertising</li>
                <li>Share your data with third parties for marketing</li>
              </ul>
            </section>

            <hr className="my-6" />

            <section>
              <h3 className="text-lg font-semibold mb-3">5. AI & Content Disclaimer</h3>
              <p className="text-muted-foreground mb-2">DW uses artificial intelligence to generate responses.</p>
              <p className="text-muted-foreground mb-2">AI outputs:</p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>Are informational and supportive</li>
                <li>May contain errors or limitations</li>
                <li>Should not be treated as professional advice</li>
              </ul>
              <p className="text-muted-foreground mt-2">You remain responsible for how you use any suggestions provided.</p>
            </section>

            <hr className="my-6" />

            <section>
              <h3 className="text-lg font-semibold mb-3">6. Document Uploads & Analysis</h3>
              <p className="text-muted-foreground mb-2">When you upload documents:</p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>Files are processed to extract structured information (e.g., meals, routines, schedules)</li>
                <li>You are shown previews and can choose what to save</li>
                <li>Nothing is committed without your confirmation</li>
              </ul>
              <p className="text-muted-foreground mt-2">Uploaded content is used only to support your experience.</p>
            </section>

            <hr className="my-6" />

            <section>
              <h3 className="text-lg font-semibold mb-3">7. Data Storage & Persistence</h3>
              <p className="text-muted-foreground mb-2">Depending on your usage:</p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>Data may be stored locally (guest mode)</li>
                <li>Or associated with your account if signed in</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                We take reasonable measures to protect stored data but cannot guarantee absolute security.
              </p>
            </section>

            <hr className="my-6" />

            <section>
              <h3 className="text-lg font-semibold mb-3">8. Your Choices & Control</h3>
              <p className="text-muted-foreground mb-2">You can:</p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>Edit or delete your plans and entries</li>
                <li>Choose whether to save or discard AI suggestions</li>
                <li>Stop using the app at any time</li>
              </ul>
              <p className="text-muted-foreground mt-2">Future versions may include additional data controls.</p>
            </section>

            <hr className="my-6" />

            <section>
              <h3 className="text-lg font-semibold mb-3">9. Payments & Monetization (If Applicable)</h3>
              <p className="text-muted-foreground mb-2">Some features may be offered as optional paid upgrades.</p>
              <p className="text-muted-foreground mb-2">Payments:</p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>Unlock software capabilities (not care or treatment)</li>
                <li>Are clearly labeled</li>
                <li>Are optional</li>
              </ul>
              <p className="text-muted-foreground mt-2">No essential wellness support is locked behind payment.</p>
            </section>

            <hr className="my-6" />

            <section>
              <h3 className="text-lg font-semibold mb-3">10. Acceptable Use</h3>
              <p className="text-muted-foreground mb-2">By using DW, you agree not to:</p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>Use the app for illegal purposes</li>
                <li>Upload harmful or malicious content</li>
                <li>Attempt to misuse or disrupt the system</li>
              </ul>
              <p className="text-muted-foreground mt-2">We reserve the right to restrict access if misuse occurs.</p>
            </section>

            <hr className="my-6" />

            <section>
              <h3 className="text-lg font-semibold mb-3">11. Changes to These Terms</h3>
              <p className="text-muted-foreground mb-2">These terms may be updated as the app evolves.</p>
              <p className="text-muted-foreground mb-2">When changes occur:</p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>The updated date will be shown</li>
                <li>Continued use indicates acceptance</li>
              </ul>
            </section>

            <hr className="my-6" />

            <section>
              <h3 className="text-lg font-semibold mb-3">12. Contact & Feedback</h3>
              <p className="text-muted-foreground mb-2">For feedback, issues, or questions, contact:</p>
              <p className="text-muted-foreground">
                Email: <a href="mailto:feedback@dimensionalwellness.com" className="text-primary hover:underline">feedback@dimensionalwellness.com</a>
              </p>
              <p className="text-muted-foreground">Subject: Feedback – DW</p>
            </section>

            <hr className="my-6" />

            <section className="pb-8">
              <h3 className="text-lg font-semibold mb-3">13. Agreement</h3>
              <p className="text-muted-foreground mb-2">By using Dimensional Wellness, you acknowledge that:</p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>You understand these terms</li>
                <li>You are using the app voluntarily</li>
                <li>You accept responsibility for how you apply its guidance</li>
              </ul>
            </section>
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
