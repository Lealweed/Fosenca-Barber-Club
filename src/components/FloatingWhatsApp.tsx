import { MessageCircle } from 'lucide-react';

interface FloatingWhatsAppProps {
  number?: string;
}

export default function FloatingWhatsApp({ number = "5511999999999" }: FloatingWhatsAppProps) {
  const message = encodeURIComponent("Olá! Gostaria de agendar um horário.");
  const whatsappUrl = `https://wa.me/${number}?text=${message}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 bg-whatsapp p-4 rounded-full shadow-2xl hover:scale-110 transition-transform animate-pulse-whatsapp flex items-center justify-center"
      aria-label="Falar no WhatsApp"
      id="floating-whatsapp"
    >
      <MessageCircle className="w-8 h-8 text-white" />
    </a>
  );
}
