// OpenAI API integration for receipt analysis
class OpenAIManager {
  static async extractReceiptData(imageBase64, openaiKey) {
    const prompt = `Please extract the following information from this receipt image:
1. Date of purchase (in YYYY-MM-DD format)
2. Total amount (as a decimal number, e.g., 12.34)

Return the response as JSON with this exact format:
{
  "date": "YYYY-MM-DD",
  "amount": "0.00"
}

If you cannot find either piece of information, use null for that field.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 300
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}${errorData.error?.message ? ' - ' + errorData.error.message : ''}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[^}]+\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      const extracted = JSON.parse(jsonStr);
      return {
        date: extracted.date || null,
        amount: extracted.amount || null
      };
    } catch (e) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Failed to parse OpenAI response');
    }
  }
}
