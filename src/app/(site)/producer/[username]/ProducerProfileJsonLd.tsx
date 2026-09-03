import type { PublicProducer } from "@/lib/serializers/producer";

interface ProducerProfileJsonLdProps {
  producer: PublicProducer;
  displayName: string;
  appUrl: string;
  socialUrls: string[];
}

export default function ProducerProfileJsonLd({
  producer,
  displayName,
  appUrl,
  socialUrls,
}: ProducerProfileJsonLdProps) {
  const profileJsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: displayName,
      url: `${appUrl}/producer/${producer.username}`,
      image: producer.avatarUrl || undefined,
      description: producer.bio || producer.store.headline || undefined,
      genre: producer.genres?.length ? producer.genres : undefined,
      sameAs: socialUrls,
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: appUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "Browse Beats",
        item: `${appUrl}/beats`,
      },
      { "@type": "ListItem", position: 3, name: displayName },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profileJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </>
  );
}
