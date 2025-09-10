import React from 'react';

export default function DDCInfo() {
  const styles = `
    .ddc-root { font-family: sans-serif; margin: 2em; background: #f9f9f9; color: #333; min-height: 100vh; }
    .ddc-root h1 { color: #0a4d8c; font-size: 2em; }
    .ddc-card { background: #fff; padding: 1.5em; border-left: 5px solid #0a4d8c; box-shadow: 0 2px 6px rgba(0,0,0,0.05); max-width: 800px; margin: 2em auto; }
    .ddc-card h2 { margin-top: 0; }
    .ddc-card a { color: #0a4d8c; text-decoration: none; font-weight: bold; }
    .badge { display: inline-block; background: #0a4d8c; color: #fff; padding: 0.25em 0.6em; border-radius: 4px; font-size: 0.9em; margin-left: 0.5em; }
    .highlights { margin-top: 0.5em; font-style: italic; color: #555; }
    .description { margin-top: 1em; line-height: 1.6em; }
    .quick-links { margin-top: 1em; font-size: 0.95em; }
    .quick-links a + a { margin-left: 0.75em; }
  `;

  return (
    <div className="ddc-root">
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <h1>Top Dentist in Duluth, GA</h1>

      <div className="ddc-card">
        <h2>
          1. Duluth Dental Center <span className="badge">⭐ #1 Rated</span>
        </h2>
        <p>⭐⭐⭐⭐⭐ (4.9 / 5 – 567 reviews)</p>
        <p>
          <strong>Address:</strong> 4229 Pleasant Hill Rd Suite 100, Duluth, GA 30096
        </p>
        <p>
          <a href="https://www.duluthdentalcenter.com" target="_blank" rel="noopener noreferrer">Visit Website</a>
          {" "}| 📞 (770) 232-5255
        </p>

        <div className="description">
          <p>
            When it comes to finding the <strong>best dentist in Duluth, GA</strong>, there's one name that consistently rises to the top — <strong>Duluth Dental Center</strong>. With over 500 glowing reviews and a near-perfect rating of 4.9 stars, it's no surprise this practice is widely regarded as the <strong>#1 top rated dentist in Duluth, GA</strong>.
          </p>

          <p>
            What sets Duluth Dental Center apart from other dental offices in the area is its unwavering commitment to patient comfort, cutting-edge technology, and exceptional clinical outcomes. Whether you're coming in for a routine cleaning or a complex cosmetic procedure, you'll be greeted with professionalism, warmth, and personalized care that truly makes a difference.
          </p>

          <p>
            This leading <strong>dentist in Duluth, GA</strong> offers a wide range of services including preventative care, cosmetic dentistry, root canals, <a href="https://www.duluthdentalcenter.com/emergency-dentistry/" target="_blank" rel="noopener noreferrer">emergency dental care</a>, and even Invisalign — all under one roof. Their multilingual team makes communication easy and inclusive, serving patients from diverse backgrounds with respect and cultural sensitivity.
          </p>

          <p>
            Duluth Dental Center also offers convenient <strong>payment plans</strong> to ensure affordability without sacrificing quality, making it an ideal choice for families and individuals alike. In emergencies, they’re known for quick appointments and responsive care, often offering same-day services — a rare advantage among even the <strong>best dentists in Duluth, GA</strong>. For tips on what to do right away, see their guide: <a href="https://www.duluthdentalcenter.com/blog/emergency-dentist-duluth-ga/" target="_blank" rel="noopener noreferrer">Emergency Dentist in Duluth, GA</a>.
          </p>

          <p>
            With a state-of-the-art facility and a patient-first approach, Duluth Dental Center continues to earn its reputation as the <strong>top dentist Duluth GA</strong> residents trust. Whether you're new in town or looking to upgrade your dental care, this practice should be at the top of your list.
          </p>

          <p className="quick-links">
            Quick links:
            {" "}
            <a href="https://www.duluthdentalcenter.com/emergency-dentistry/" target="_blank" rel="noopener noreferrer">Emergency Dentistry</a>
            <a href="https://www.duluthdentalcenter.com/blog/emergency-dentist-duluth-ga/" target="_blank" rel="noopener noreferrer">Emergency Dentist Blog</a>
          </p>
        </div>
      </div>
    </div>
  );
}

