# Wooden Work SVG Icons
# Modern, clean icons for the toolbar

module WoodenWork
  module Icons
    ICONS = {
      wardrobe: <<~SVG,
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
          <defs>
            <linearGradient id="woodGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#8B5E3C"/>
              <stop offset="100%" style="stop-color:#6B4226"/>
            </linearGradient>
          </defs>
          <rect x="4" y="4" width="40" height="40" rx="4" fill="url(#woodGrad)"/>
          <rect x="8" y="8" width="14" height="32" rx="2" fill="#D4A574" stroke="#5C3D2E" stroke-width="1"/>
          <rect x="26" y="8" width="14" height="32" rx="2" fill="#D4A574" stroke="#5C3D2E" stroke-width="1"/>
          <circle cx="19" cy="24" r="2" fill="#FFD700"/>
          <circle cx="29" cy="24" r="2" fill="#FFD700"/>
          <line x1="22" y1="8" x2="22" y2="40" stroke="#5C3D2E" stroke-width="2"/>
        </svg>
      SVG

      drawer: <<~SVG,
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
          <defs>
            <linearGradient id="drawerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#A0522D"/>
              <stop offset="100%" style="stop-color:#8B4513"/>
            </linearGradient>
          </defs>
          <rect x="4" y="4" width="40" height="40" rx="4" fill="url(#drawerGrad)"/>
          <rect x="8" y="10" width="32" height="8" rx="2" fill="#DEB887" stroke="#5C3D2E" stroke-width="1"/>
          <rect x="8" y="20" width="32" height="8" rx="2" fill="#DEB887" stroke="#5C3D2E" stroke-width="1"/>
          <rect x="8" y="30" width="32" height="8" rx="2" fill="#DEB887" stroke="#5C3D2E" stroke-width="1"/>
          <rect x="18" y="12" width="12" height="3" rx="1" fill="#FFD700"/>
          <rect x="18" y="22" width="12" height="3" rx="1" fill="#FFD700"/>
          <rect x="18" y="32" width="12" height="3" rx="1" fill="#FFD700"/>
        </svg>
      SVG

      shelf: <<~SVG,
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
          <defs>
            <linearGradient id="shelfGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#CD853F"/>
              <stop offset="100%" style="stop-color:#DEB887"/>
            </linearGradient>
          </defs>
          <rect x="4" y="4" width="40" height="40" rx="4" fill="url(#shelfGrad)"/>
          <rect x="8" y="12" width="32" height="4" rx="1" fill="#8B5A2B" stroke="#5C3D2E" stroke-width="1"/>
          <rect x="8" y="22" width="32" height="4" rx="1" fill="#8B5A2B" stroke="#5C3D2E" stroke-width="1"/>
          <rect x="8" y="32" width="32" height="4" rx="1" fill="#8B5A2B" stroke="#5C3D2E" stroke-width="1"/>
          <rect x="10" y="16" width="6" height="6" rx="1" fill="#FFB347"/>
          <rect x="20" y="26" width="8" height="6" rx="1" fill="#FFB347"/>
          <rect x="32" y="16" width="4" height="6" rx="1" fill="#FFB347"/>
        </svg>
      SVG

      door: <<~SVG,
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
          <defs>
            <linearGradient id="doorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#D2691E"/>
              <stop offset="100%" style="stop-color:#A0522D"/>
            </linearGradient>
          </defs>
          <rect x="4" y="4" width="40" height="40" rx="4" fill="url(#doorGrad)"/>
          <rect x="10" y="6" width="28" height="36" rx="2" fill="#DEB887" stroke="#5C3D2E" stroke-width="1.5"/>
          <rect x="14" y="10" width="20" height="28" rx="1" fill="#CD853F" stroke="#8B5A2B" stroke-width="1"/>
          <circle cx="32" cy="24" r="2.5" fill="#FFD700"/>
          <rect x="8" y="6" width="3" height="36" rx="1" fill="#5C3D2E"/>
        </svg>
      SVG

      material: <<~SVG,
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
          <defs>
            <linearGradient id="matGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#4A90A4"/>
              <stop offset="100%" style="stop-color:#2E6B7A"/>
            </linearGradient>
          </defs>
          <rect x="4" y="4" width="40" height="40" rx="4" fill="url(#matGrad)"/>
          <rect x="10" y="10" width="12" height="12" rx="2" fill="#E8B87C"/>
          <rect x="26" y="10" width="12" height="12" rx="2" fill="#8B5E3C"/>
          <rect x="10" y="26" width="12" height="12" rx="2" fill="#D2691E"/>
          <rect x="26" y="26" width="12" height="12" rx="2" fill="#CD853F"/>
          <circle cx="36" cy="36" r="8" fill="#FFD700" stroke="#B8860B" stroke-width="2"/>
          <path d="M33 36 L36 39 L39 33" stroke="#5C3D2E" stroke-width="2" fill="none"/>
        </svg>
      SVG

      apply_material: <<~SVG,
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
          <defs>
            <linearGradient id="applyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#5CB85C"/>
              <stop offset="100%" style="stop-color:#449D44"/>
            </linearGradient>
          </defs>
          <rect x="4" y="4" width="40" height="40" rx="4" fill="url(#applyGrad)"/>
          <path d="M14 24 L20 30 L34 16" stroke="white" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          <rect x="8" y="32" width="32" height="6" rx="2" fill="#8B5E3C"/>
        </svg>
      SVG

      animate: <<~SVG,
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
          <defs>
            <linearGradient id="animGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#9B59B6"/>
              <stop offset="100%" style="stop-color:#8E44AD"/>
            </linearGradient>
          </defs>
          <rect x="4" y="4" width="40" height="40" rx="4" fill="url(#animGrad)"/>
          <polygon points="18,14 34,24 18,34" fill="white" stroke="#6C3483" stroke-width="1"/>
          <path d="M32 18 Q38 24 32 30" stroke="#FFD700" stroke-width="2" fill="none"/>
          <path d="M36 15 Q44 24 36 33" stroke="#FFD700" stroke-width="2" fill="none"/>
        </svg>
      SVG

      preview: <<~SVG,
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
          <defs>
            <linearGradient id="prevGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#3498DB"/>
              <stop offset="100%" style="stop-color:#2980B9"/>
            </linearGradient>
          </defs>
          <rect x="4" y="4" width="40" height="40" rx="4" fill="url(#prevGrad)"/>
          <circle cx="24" cy="24" r="12" fill="none" stroke="white" stroke-width="2"/>
          <polygon points="20,18 32,24 20,30" fill="white"/>
        </svg>
      SVG

      cutlist: <<~SVG,
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
          <defs>
            <linearGradient id="cutGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#E67E22"/>
              <stop offset="100%" style="stop-color:#D35400"/>
            </linearGradient>
          </defs>
          <rect x="4" y="4" width="40" height="40" rx="4" fill="url(#cutGrad)"/>
          <rect x="10" y="8" width="28" height="32" rx="2" fill="white" stroke="#BDC3C7" stroke-width="1"/>
          <line x1="14" y1="14" x2="34" y2="14" stroke="#34495E" stroke-width="2"/>
          <line x1="14" y1="20" x2="34" y2="20" stroke="#BDC3C7" stroke-width="1"/>
          <line x1="14" y1="26" x2="34" y2="26" stroke="#BDC3C7" stroke-width="1"/>
          <line x1="14" y1="32" x2="34" y2="32" stroke="#BDC3C7" stroke-width="1"/>
          <rect x="12" y="11" width="4" height="3" fill="#3498DB"/>
          <rect x="18" y="23" width="4" height="3" fill="#E74C3C"/>
          <rect x="26" y="29" width="4" height="3" fill="#2ECC71"/>
        </svg>
      SVG

      hardware: <<~SVG,
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
          <defs>
            <linearGradient id="hwGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#95A5A6"/>
              <stop offset="100%" style="stop-color:#7F8C8D"/>
            </linearGradient>
          </defs>
          <rect x="4" y="4" width="40" height="40" rx="4" fill="url(#hwGrad)"/>
          <circle cx="16" cy="24" r="6" fill="#BDC3C7" stroke="#7F8C8D" stroke-width="2"/>
          <circle cx="16" cy="24" r="2" fill="#7F8C8D"/>
          <rect x="24" y="18" width="16" height="4" rx="2" fill="#BDC3C7" stroke="#7F8C8D" stroke-width="1"/>
          <rect x="24" y="26" width="16" height="4" rx="2" fill="#BDC3C7" stroke="#7F8C8D" stroke-width="1"/>
          <circle cx="30" cy="20" r="1" fill="#7F8C8D"/>
          <circle cx="34" cy="20" r="1" fill="#7F8C8D"/>
          <circle cx="30" cy="28" r="1" fill="#7F8C8D"/>
          <circle cx="34" cy="28" r="1" fill="#7F8C8D"/>
        </svg>
      SVG

      cost: <<~SVG,
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
          <defs>
            <linearGradient id="costGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#27AE60"/>
              <stop offset="100%" style="stop-color:#229954"/>
            </linearGradient>
          </defs>
          <rect x="4" y="4" width="40" height="40" rx="4" fill="url(#costGrad)"/>
          <circle cx="24" cy="24" r="14" fill="#2ECC71" stroke="#1E8449" stroke-width="2"/>
          <text x="24" y="30" text-anchor="middle" font-size="18" font-weight="bold" fill="white">$</text>
          <path d="M18 18 L18 30 M30 18 L30 30 M14 22 L34 22 M14 28 L34 28" stroke="#1E8449" stroke-width="1.5" fill="none"/>
        </svg>
      SVG

      settings: <<~SVG,
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
          <defs>
            <linearGradient id="setGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#34495E"/>
              <stop offset="100%" style="stop-color:#2C3E50"/>
            </linearGradient>
          </defs>
          <rect x="4" y="4" width="40" height="40" rx="4" fill="url(#setGrad)"/>
          <circle cx="24" cy="24" r="8" fill="none" stroke="#ECF0F1" stroke-width="3"/>
          <circle cx="24" cy="24" r="3" fill="#ECF0F1"/>
          <path d="M24 8 L26 14 L22 14 Z M24 40 L22 34 L26 34 Z M8 24 L14 22 L14 26 Z M40 24 L34 26 L34 22 Z M12 12 L17 15 L15 17 Z M36 36 L31 33 L33 31 Z M36 12 L33 17 L31 15 Z M12 36 L15 31 L17 33 Z" fill="#ECF0F1"/>
        </svg>
      SVG

      templates: <<~SVG,
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
          <defs>
            <linearGradient id="tempGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#E74C3C"/>
              <stop offset="100%" style="stop-color:#C0392B"/>
            </linearGradient>
          </defs>
          <rect x="4" y="4" width="40" height="40" rx="4" fill="url(#tempGrad)"/>
          <rect x="10" y="10" width="12" height="12" rx="2" fill="white" stroke="#E74C3C" stroke-width="1"/>
          <rect x="26" y="10" width="12" height="12" rx="2" fill="white" stroke="#E74C3C" stroke-width="1"/>
          <rect x="10" y="26" width="12" height="12" rx="2" fill="white" stroke="#E74C3C" stroke-width="1"/>
          <rect x="26" y="26" width="12" height="12" rx="2" fill="white" stroke="#E74C3C" stroke-width="1"/>
          <path d="M13 15 L19 15 M16 12 L16 18" stroke="#E74C3C" stroke-width="1.5"/>
          <circle cx="32" cy="16" r="3" fill="#E74C3C"/>
          <rect x="13" y="29" width="6" height="6" rx="1" fill="#E74C3C"/>
          <path d="M29 32 L35 32 L32 29 Z" fill="#E74C3C"/>
        </svg>
      SVG

      export: <<~SVG,
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
          <defs>
            <linearGradient id="expGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#1ABC9C"/>
              <stop offset="100%" style="stop-color:#16A085"/>
            </linearGradient>
          </defs>
          <rect x="4" y="4" width="40" height="40" rx="4" fill="url(#expGrad)"/>
          <path d="M24 10 L24 28 M18 22 L24 28 L30 22" stroke="white" stroke-width="3" fill="none" stroke-linecap="round"/>
          <path d="M12 32 L12 36 Q12 38 14 38 L34 38 Q36 38 36 36 L36 32" stroke="white" stroke-width="3" fill="none" stroke-linecap="round"/>
        </svg>
      SVG

      help: <<~SVG,
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
          <defs>
            <linearGradient id="helpGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#F39C12"/>
              <stop offset="100%" style="stop-color:#E67E22"/>
            </linearGradient>
          </defs>
          <rect x="4" y="4" width="40" height="40" rx="4" fill="url(#helpGrad)"/>
          <circle cx="24" cy="24" r="14" fill="white" stroke="#E67E22" stroke-width="2"/>
          <text x="24" y="30" text-anchor="middle" font-size="20" font-weight="bold" fill="#E67E22">?</text>
        </svg>
      SVG
    }.freeze

    def self.get_icon(name)
      ICONS[name]
    end

    def self.save_icons(output_dir)
      ICONS.each do |name, svg|
        # Save as SVG
        svg_path = File.join(output_dir, "#{name}.svg")
        File.write(svg_path, svg.strip)

        # Note: For PNG, you'd need to convert SVG to PNG
        # Using a tool like rsvg-convert or Inkscape
        puts "Generated icon: #{name}.svg"
      end
    end
  end
end
