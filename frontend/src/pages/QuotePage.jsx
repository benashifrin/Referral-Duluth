import React from 'react';

const QuotePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 relative overflow-hidden">
          {/* Decorative corner */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-bl-full opacity-50"></div>
          
          <div className="relative z-10">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                To The Crazy Ones
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-600 mx-auto rounded"></div>
            </div>

            <div className="prose prose-lg md:prose-xl max-w-none text-gray-700 leading-relaxed">
              <blockquote className="text-center italic text-xl md:text-2xl leading-loose border-none p-0">
                <p className="mb-6">
                  Here's to the crazy ones. The misfits. The rebels. The troublemakers. 
                  The round pegs in the square holes. The ones who see things differently.
                </p>
                
                <p className="mb-6">
                  They're not fond of rules. And they have no respect for the status quo.
                </p>
                
                <p className="mb-6">
                  You can praise them, disagree with them, quote them, disbelieve them, 
                  glorify or vilify them. About the only thing you can't do is ignore them. 
                  Because they change things.
                </p>
                
                <p className="mb-6">
                  They invent. They imagine. They heal. They explore. They create. They inspire. 
                  They push the human race forward.
                </p>
                
                <p className="mb-8">
                  Maybe they have to be crazy. How else can you stare at an empty canvas and 
                  see a work of art? Or sit in silence and hear a song that's never been written? 
                  Or gaze at a red planet and see a laboratory on wheels?
                </p>
              </blockquote>

              <div className="text-center mt-12 pt-8 border-t border-gray-200">
                <p className="text-sm text-gray-500 font-medium">
                  — Think Different Campaign
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotePage;