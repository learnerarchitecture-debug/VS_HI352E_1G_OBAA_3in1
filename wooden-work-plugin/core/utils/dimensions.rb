# Wooden Work - Dimensions Utility
# Handles measurements, cutlist generation, and cost calculation

module WoodenWork
  module Utils
    class Dimensions
      def self.generate_cutlist
        model = Sketchup.active_model
        cutlist = []

        model.active_entities.each do |entity|
          if entity.is_a?(Sketchup::Group)
            extract_components(entity, cutlist)
          end
        end

        display_cutlist(cutlist)
        cutlist
      end

      def self.cost_calculator
        model = Sketchup.active_model
        total_material = 0.0
        total_hardware = 0.0

        prices = {
          oak: 8.50,
          walnut: 12.00,
          cherry: 9.50,
          maple: 7.00,
          pine: 3.50
        }

        model.active_entities.each do |entity|
          if entity.is_a?(Sketchup::Group)
            vol_cubic_inches = entity.bounds.volume
            board_feet = vol_cubic_inches / 144.0
            material_cost = board_feet * (prices[:oak] || 8.50)
            total_material += material_cost
          end
        end

        total_hardware = calculate_hardware_cost(model)
        total = total_material + total_hardware

        result = {
          material: total_material,
          hardware: total_hardware,
          total: total
        }

        display_cost(result)
        result
      end

      class << self
        private

        def extract_components(entity, cutlist)
          name = entity.name
          width = (entity.bounds.width * 1000).round
          height = (entity.bounds.height * 1000).round
          depth = (entity.bounds.depth * 1000).round

          if name.include?('Panel') || name.include?('Side') || name.include?('Top') || name.include?('Bottom') || name.include?('Shelf')
            cutlist << {
              name: name,
              quantity: 1,
              width: width,
              height: height,
              thickness: 18,
              material: 'Wood',
              grain: 'Vertical'
            }
          end

          entity.entities.each do |child|
            extract_components(child, cutlist) if child.is_a?(Sketchup::Group)
          end
        end

        def calculate_hardware_cost(model)
          count = 0
          model.active_entities.each do |entity|
            if entity.is_a?(Sketchup::Group)
              count += count_hardware(entity)
            end
          end
          count * 2.50
        end

        def count_hardware(entity)
          count = 0
          entity.entities.each do |child|
            if child.is_a?(Sketchup::Group) || child.is_a?(Sketchup::ComponentInstance)
              name = child.name.downcase
              count += 1 if name.include?('hinge') || name.include?('handle') || name.include?('slide')
            end
          end
          count
        end

        def display_cutlist(cutlist)
          html = '<html><head><style>'
          html += 'body{font-family:Arial,sans-serif;padding:20px}'
          html += 'h2{color:#c8956c}'
          html += 'table{width:100%;border-collapse:collapse;margin-top:10px}'
          html += 'th{background:#2c3e50;color:white;padding:8px;text-align:left}'
          html += 'td{padding:8px;border-bottom:1px solid #ddd}'
          html += 'tr:hover{background:#f5f5f5}'
          html += '</style></head><body>'
          html += '<h2>Cutlist Report</h2>'
          html += '<table><tr><th>Part</th><th>Qty</th><th>Width</th><th>Height</th><th>Thickness</th><th>Material</th></tr>'

          cutlist.each do |item|
            html += "<tr><td>#{item[:name]}</td><td>#{item[:quantity]}</td><td>#{item[:width]}mm</td><td>#{item[:height]}mm</td><td>#{item[:thickness]}mm</td><td>#{item[:material]}</td></tr>"
          end

          html += '</table></body></html>'

          dialog = UI::HtmlDialog.new(title: 'Cutlist', width: 600, height: 400)
          dialog.set_html(html)
          dialog.show
        end

        def display_cost(result)
          html = '<html><head><style>'
          html += 'body{font-family:Arial,sans-serif;padding:20px;text-align:center}'
          html += '.card{background:#f8f9fa;border-radius:8px;padding:20px;margin:10px;display:inline-block}'
          html += '.value{font-size:24px;font-weight:bold;color:#c8956c}'
          html += '.label{color:#666;margin-top:5px}'
          html += '</style></head><body>'
          html += '<h2>Cost Estimate</h2>'
          html += "<div class='card'><div class='value'>$#{'%.2f' % result[:material]}</div><div class='label'>Material</div></div>"
          html += "<div class='card'><div class='value'>$#{'%.2f' % result[:hardware]}</div><div class='label'>Hardware</div></div>"
          html += "<div class='card'><div class='value'>$#{'%.2f' % result[:total]}</div><div class='label'>Total</div></div>"
          html += '</body></html>'

          dialog = UI::HtmlDialog.new(title: 'Cost Estimate', width: 500, height: 300)
          dialog.set_html(html)
          dialog.show
        end
      end
    end
  end
end
