import Link from "next/link";

export default function Home() {
  return (
    <div>
      <section id="hero" className="relative bg-gradient-to-r from-dark to-primary text-white py-24 rounded-b-3xl overflow-hidden shadow-xl">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl text-center md:text-left">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight drop-shadow-lg">Fast, Secure <span className="text-accent">Education</span> Fee Payments</h1>
            <p className="text-xl md:text-2xl mb-10 text-textLight leading-relaxed">Pay tuition and school fees instantly. 100% secure transactions with real-time confirmations.</p>
            <div className="flex flex-col sm:flex-row gap-5 justify-center md:justify-start">
              <Link href="/pay-premium" className="bg-accent hover:bg-secondary text-dark font-bold py-4 px-10 rounded-full text-lg text-center transition duration-300 shadow-lg">Pay Fees Now</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-lightBg">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="bg-cardBg p-10 rounded-2xl shadow-xl text-center border border-lightBg">
              <div className="text-6xl font-bold text-primary mb-4 drop-shadow-md">5 min</div>
              <div className="text-2xl font-semibold text-gray-700 mb-2">Average Payment Time</div>
              <p className="text-gray-600 mt-2 text-lg">Complete your fee payment in just a few clicks.</p>
            </div>
            <div className="bg-cardBg p-10 rounded-2xl shadow-xl text-center border border-lightBg">
              <div className="text-6xl font-bold text-primary mb-4 drop-shadow-md">2K+</div>
              <div className="text-2xl font-semibold text-gray-700 mb-2">Institutions Supported</div>
              <p className="text-gray-600 mt-2 text-lg">Schools, colleges, and universities across India.</p>
            </div>
            <div className="bg-cardBg p-10 rounded-2xl shadow-xl text-center border border-lightBg">
              <div className="text-6xl font-bold text-primary mb-4 drop-shadow-md">24/7</div>
              <div className="text-2xl font-semibold text-gray-700 mb-2">Payment Support</div>
              <p className="text-gray-600 mt-2 text-lg">We’re here to help with any fee payment queries.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="about-us" className="py-20 bg-white">
        <div className="container mx-auto px-6 text-center max-w-4xl">
          <h2 className="text-4xl md:text-5xl font-bold text-dark mb-6">About SabPe Education</h2>
          <p className="text-gray-600 text-xl leading-relaxed mb-8">
            At <b>SabPe</b>, we make education fee payments simple and secure. Pay tuition, exam, hostel and transport fees online with instant acknowledgment.
          </p>
          <p className="text-gray-600 text-xl leading-relaxed">
            We partner with institutions to streamline collections and help parents and students avoid queues and cash handling.
          </p>
        </div>
      </section>

      <section className="py-20 bg-lightBg">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-dark mb-6">How to Pay Your Education Fees</h2>
            <p className="text-gray-600 text-xl leading-relaxed">Simple, secure, and convenient fee payment in just a few steps.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {["Register / Login", "Select Institution", "Enter Student Details", "Pay & Get Receipt"].map((title, idx) => (
              <div key={title} className="bg-cardBg p-8 rounded-2xl shadow-lg text-center border border-lightBg">
                <div className="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <span className="text-3xl font-bold">{idx + 1}</span>
                </div>
                <h4 className="font-bold text-xl mb-3 text-dark">{title}</h4>
                <p className="text-gray-600 leading-relaxed">
                  {idx === 0 && "Login to your SabPe account to start the payment."}
                  {idx === 1 && "Choose your school/college or search from the list."}
                  {idx === 2 && "Provide student ID, class/semester and fee particulars."}
                  {idx === 3 && "Pay securely and download the receipt instantly."}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact-us" className="py-20 bg-lightBg">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-bold text-dark text-center mb-10">Get in Touch</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-cardBg p-10 rounded-2xl shadow-xl border border-lightBg">
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-semibold text-primary mb-3">📍 Our Location</h3>
                <p className="text-gray-700 text-lg leading-relaxed">UG 150, Marvella Corridor, VIP Road, Vesu, Surat -  395007</p>
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-primary mb-3">📞 Call Us</h3>
                <p className="text-gray-700 text-lg">Ajay Bhutra</p>
                <p className="text-secondary text-lg font-medium"><a href="tel:+919327282729" className="hover:underline">+91 93272 82729</a></p>
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-primary mb-3">📧 Email Us</h3>
                <p className="text-secondary text-lg font-medium"><a href="mailto:support@sabpe.com" className="hover:underline">support@sabpe.com</a></p>
                <p className="text-gray-700 text-lg mt-2">For general inquiries and support.</p>
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-primary mb-3">🕒 Working Hours</h3>
                <p className="text-gray-700 text-lg">Mon - Sat: 9:00 AM to 6:00 PM</p>
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-primary mb-3">🏢 Legal Name</h3>
                <p className="text-gray-700 text-lg">KB ToPay Finovative LLP</p>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden shadow-lg h-full border border-lightBg">
              <img src="/education.jpeg" alt="Education" className="h-full w-full object-cover" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
