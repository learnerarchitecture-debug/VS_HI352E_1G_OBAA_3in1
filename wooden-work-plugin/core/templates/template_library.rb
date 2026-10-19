# Wooden Work - Template Library
# Pre-built furniture design templates

module WoodenWork
  module Templates
    class TemplateLibrary
      TEMPLATES = {
        'wardrobe_2door' => {
          name: '2-Door Wardrobe',
          description: 'Standard 1200x2400mm hinged wardrobe',
          type: :wardrobe,
          params: {
            width: 1200, height: 2400, depth: 600,
            shelves: 3, rods: 1, drawers: 0,
            doors: 'hinged', material: 'oak'
          }
        },
        'wardrobe_sliding' => {
          name: 'Sliding Wardrobe',
          description: 'Modern sliding door wardrobe',
          type: :wardrobe,
          params: {
            width: 1800, height: 2400, depth: 650,
            shelves: 4, rods: 2, drawers: 2,
            doors: 'sliding', material: 'walnut'
          }
        },
        'dresser_3draw' => {
          name: '3-Drawer Dresser',
          description: 'Standard bedroom dresser',
          type: :drawer,
          params: {
            width: 800, height: 900, depth: 500,
            count: 3, eachHeight: 250,
            handle: 'bar', slide: 'full', material: 'cherry'
          }
        },
        'bookshelf' => {
          name: 'Bookshelf',
          description: '5-tier open bookshelf',
          type: :shelf,
          params: {
            width: 800, depth: 300, thickness: 18,
            count: 5, spacing: 300,
            style: 'floating', material: 'pine'
          }
        },
        'tv_unit' => {
          name: 'TV Unit',
          description: 'Entertainment center with storage',
          type: :wardrobe,
          params: {
            width: 1600, height: 500, depth: 400,
            shelves: 2, rods: 0, drawers: 2,
            doors: 'hinged', material: 'oak'
          }
        },
        'kitchen_cabinet' => {
          name: 'Kitchen Cabinet',
          description: 'Base cabinet with doors',
          type: :wardrobe,
          params: {
            width: 600, height: 720, depth: 580,
            shelves: 1, rods: 0, drawers: 0,
            doors: 'hinged', material: 'maple'
          }
        }
      }.freeze

      TEMPLATE_DIR = File.join(File.dirname(__FILE__), '..', '..', 'templates')

      def self.show
        html = build_template_html

        dialog = UI::HtmlDialog.new(
          title: 'Design Templates',
          width: 700,
          height: 500,
          resizable: true
        )
        dialog.set_html(html)
        dialog.show
      end

      def self.load(template_id)
        template = TEMPLATES[template_id]
        return unless template

        case template[:type]
        when :wardrobe
          Components::Wardrobe.new.create(template[:params])
        when :drawer
          Components::Drawer.new.create(template[:params])
        when :shelf
          Components::Shelf.new.create(template[:params])
        when :door
          Components::Door.new.create(template[:params])
        end
      end

      def self.save_current
        model = Sketchup.active_model
        path = UI.savepanel('Save Template', TEMPLATE_DIR, 'my_template.json')
        return unless path

        data = {
          name: File.basename(path, '.json'),
          timestamp: Time.now.to_s,
          components: []
        }

        model.active_entities.each do |entity|
          if entity.is_a?(Sketchup::Group)
            data[:components] << {
              name: entity.name,
              bounds: {
                width: (entity.bounds.width * 1000).round,
                height: (entity.bounds.height * 1000).round,
                depth: (entity.bounds.depth * 1000).round
              }
            }
          end
        end

        FileUtils.mkdir_p(TEMPLATE_DIR) unless File.directory?(TEMPLATE_DIR)
        File.write(path, JSON.pretty_generate(data))
        UI.messagebox("Template saved to:\n#{path}")
      end

      private

      def self.build_template_html
        html = '<html><head><style>'
        html += 'body{font-family:Arial,sans-serif;padding:20px;background:#1a1a2e;color:white}'
        html += 'h2{color:#c8956c;margin-bottom:20px}'
        html += '.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}'
        html += '.card{background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:16px;cursor:pointer;transition:all 0.3s}'
        html += '.card:hover{border-color:#c8956c;transform:translateY(-2px)}'
        html += '.name{font-size:14px;font-weight:bold;margin-bottom:4px}'
        html += '.desc{font-size:11px;color:#999}'
        html += '</style></head><body>'
        html += '<h2>Design Templates</h2><div class="grid">'

        TEMPLATES.each do |id, template|
          html += "<div class='card' onclick='window.location=\"skp:load_template@#{id}\"'>"
          html += "<div class='name'>#{template[:name]}</div>"
          html += "<div class='desc'>#{template[:description]}</div>"
          html += '</div>'
        end

        html += '</div></body></html>'
        html
      end
    end
  end
end
