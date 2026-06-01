import { MessageCircle } from 'lucide-react';

interface FloatingWhatsAppProps {
  number?: string;
  message?: string;
}

export default function FloatingWhatsApp({ number = "5594992496583", message = "Ola! Vim pelo site da Fonseca Barber Club e quero agendar meu horario. Pode me mostrar os horarios disponiveis?" }: FloatingWhatsAppProps) {
  const sanitizedNumber = String(number).replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${sanitizedNumber}?text=${encodedMessage}`;

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
