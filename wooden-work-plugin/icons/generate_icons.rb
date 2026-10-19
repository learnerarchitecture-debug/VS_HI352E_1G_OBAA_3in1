# Wooden Work - Icon Generator
# Run this once to generate PNG icons from SVG definitions

require 'fileutils'

module WoodenWork
  module IconGenerator
    ICON_DIR = File.join(File.dirname(__FILE__), '..', 'icons')

    ICON_SVGS = {
      'wardrobe' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="4" fill="#8B5E3C"/><rect x="3" y="3" width="12" height="26" rx="2" fill="#D4A574"/><rect x="17" y="3" width="12" height="26" rx="2" fill="#D4A574"/><circle cx="12" cy="16" r="2" fill="#FFD700"/><circle cx="20" cy="16" r="2" fill="#FFD700"/></svg>',
      'drawer' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="4" fill="#A0522D"/><rect x="3" y="3" width="26" height="7" rx="2" fill="#DEB887"/><rect x="3" y="12" width="26" height="7" rx="2" fill="#DEB887"/><rect x="3" y="21" width="26" height="7" rx="2" fill="#DEB887"/><rect x="11" y="5" width="10" height="2" rx="1" fill="#FFD700"/><rect x="11" y="14" width="10" height="2" rx="1" fill="#FFD700"/><rect x="11" y="23" width="10" height="2" rx="1" fill="#FFD700"/></svg>',
      'shelf' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="4" fill="#CD853F"/><rect x="3" y="4" width="26" height="3" rx="1" fill="#8B5A2B"/><rect x="3" y="11" width="26" height="3" rx="1" fill="#8B5A2B"/><rect x="3" y="18" width="26" height="3" rx="1" fill="#8B5A2B"/><rect x="3" y="25" width="26" height="3" rx="1" fill="#8B5A2B"/><rect x="6" y="7" width="5" height="4" rx="1" fill="#FFB347"/><rect x="14" y="14" width="6" height="4" rx="1" fill="#FFB347"/></svg>',
      'door' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="4" fill="#D2691E"/><rect x="6" y="2" width="20" height="28" rx="2" fill="#DEB887"/><rect x="8" y="4" width="16" height="24" rx="1" fill="#CD853F"/><circle cx="22" cy="16" r="2" fill="#FFD700"/></svg>',
      'material' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="4" fill="#4A90A4"/><rect x="3" y="3" width="12" height="12" rx="2" fill="#E8B87C"/><rect x="17" y="3" width="12" height="12" rx="2" fill="#8B5E3C"/><rect x="3" y="17" width="12" height="12" rx="2" fill="#D2691E"/><rect x="17" y="17" width="12" height="12" rx="2" fill="#CD853F"/></svg>',
      'apply_material' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="4" fill="#5CB85C"/><path d="M8 16 L13 21 L24 10" stroke="white" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
      'animate' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="4" fill="#9B59B6"/><polygon points="12,8 24,16 12,24" fill="white"/></svg>',
      'preview' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="4" fill="#3498DB"/><circle cx="16" cy="16" r="10" fill="none" stroke="white" stroke-width="2"/><polygon points="13,11 22,16 13,21" fill="white"/></svg>',
      'cutlist' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="4" fill="#E67E22"/><rect x="6" y="4" width="20" height="24" rx="2" fill="white"/><line x1="9" y1="10" x2="23" y2="10" stroke="#34495E" stroke-width="1.5"/><line x1="9" y1="15" x2="23" y2="15" stroke="#BDC3C7" stroke-width="1"/><line x1="9" y1="20" x2="23" y2="20" stroke="#BDC3C7" stroke-width="1"/></svg>',
      'hardware' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="4" fill="#95A5A6"/><circle cx="10" cy="16" r="5" fill="#BDC3C7" stroke="#7F8C8D" stroke-width="2"/><rect x="18" y="12" width="10" height="3" rx="1" fill="#BDC3C7"/><rect x="18" y="18" width="10" height="3" rx="1" fill="#BDC3C7"/></svg>',
      'cost' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="4" fill="#27AE60"/><circle cx="16" cy="16" r="11" fill="#2ECC71"/><text x="16" y="21" text-anchor="middle" font-size="14" font-weight="bold" fill="white">$</text></svg>',
      'settings' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="4" fill="#34495E"/><circle cx="16" cy="16" r="6" fill="none" stroke="#ECF0F1" stroke-width="2.5"/><circle cx="16" cy="16" r="2" fill="#ECF0F1"/><path d="M16 4L17 8L15 8Z M16 28L15 24L17 24Z M4 16L8 15L8 17Z M28 16L24 17L24 15Z" fill="#ECF0F1"/></svg>',
      'templates' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="4" fill="#E74C3C"/><rect x="4" y="4" width="10" height="10" rx="2" fill="white"/><rect x="18" y="4" width="10" height="10" rx="2" fill="white"/><rect x="4" y="18" width="10" height="10" rx="2" fill="white"/><rect x="18" y="18" width="10" height="10" rx="2" fill="white"/></svg>',
      'export' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="4" fill="#1ABC9C"/><path d="M16 4L16 20M10 14L16 20L22 14" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M6 24L6 26Q6 28 8 28L24 28Q26 28 26 26L26 24" stroke="white" stroke-width="2.5" fill="none"/></svg>',
      'help' => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="4" fill="#F39C12"/><circle cx="16" cy="16" r="11" fill="white"/><text x="16" y="21" text-anchor="middle" font-size="16" font-weight="bold" fill="#E67E22">?</text></svg>'
    }

    def self.generate_all
      ICON_SVGS.each do |name, svg|
        save_svg(name, svg)
        puts "Generated: #{name}.svg"
      end
      puts "\nAll icons generated in #{ICON_DIR}"
      puts "Note: For PNG conversion, use: rsvg-convert or Inkscape CLI"
    end

    def self.save_svg(name, svg)
      path = File.join(ICON_DIR, "#{name}.svg")
      File.write(path, svg.strip)
    end
  end
end

if __FILE__ == $0
  WoodenWork::IconGenerator.generate_all
end
