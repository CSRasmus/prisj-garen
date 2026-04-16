import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const posts = await base44.asServiceRole.entities.BlogPost.filter({ published: true }, "-created_date", 1000);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Static pages
    xml += '  <url>\n    <loc>https://app.prisjagaren.se/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>\n';
    xml += '  <url>\n    <loc>https://app.prisjagaren.se/blogg</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n';

    // Blog posts
    posts.forEach(post => {
      xml += '  <url>\n';
      xml += `    <loc>https://app.prisjagaren.se/blogg/${post.slug}</loc>\n`;
      xml += `    <lastmod>${post.updated_date || post.created_date}</lastmod>\n`;
      xml += `    <changefreq>monthly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += '  </url>\n';
    });

    xml += '</urlset>';

    return new Response(xml, {
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});