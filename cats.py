import os
import glob


def concatenate_js_files(output_filename="cats.txt"):
    """
    Concatenates all .js files in the current directory into a single text file.

    Args:
        output_filename (str): The name of the output text file.
                               Defaults to 'cats.txt'.
    """
    js_files = glob.glob("*.js")
    if not js_files:
        print("No .js files found in the current directory.")
        return

    with open(output_filename, "w") as outfile:
        for js_file in js_files:
            with open(js_file, "r") as infile:
                outfile.write(infile.read())
                outfile.write(
                    "\n\n--------------------------------------------------------------------------------\n\n"
                )

    print(f"Concatenated .js files into '{output_filename}'")


if __name__ == "__main__":
    concatenate_js_files()
