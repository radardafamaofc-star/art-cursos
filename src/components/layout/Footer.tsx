import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 font-bold text-xl">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
                <GraduationCap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span>EduPlatform</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Transformando vidas através da educação online de qualidade.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Plataforma</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/courses" className="hover:text-foreground transition-colors">Cursos</Link></li>
              <li><Link to="/about" className="hover:text-foreground transition-colors">Sobre Nós</Link></li>
              <li><Link to="/contact" className="hover:text-foreground transition-colors">Contato</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Suporte</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/help" className="hover:text-foreground transition-colors">Central de Ajuda</Link></li>
              <li><Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
              <li><Link to="/terms" className="hover:text-foreground transition-colors">Termos de Uso</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacidade</Link></li>
              <li><Link to="/cookies" className="hover:text-foreground transition-colors">Cookies</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>© 2025 EduPlatform. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
